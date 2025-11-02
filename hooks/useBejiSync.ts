import { useEffect, useRef, useCallback } from "react";
import { createBejiSyncClient, type BejiSyncClient } from "../src/lib/realtime/bejiSync";
import type { IPosition } from "../components/atoms";

interface UseBejiSyncOptions {
    bejiId: string | null;
    onUpdate?: (update: { position: IPosition; target?: IPosition; walk: boolean }) => void;
}

export function useBejiSync({ bejiId, onUpdate }: UseBejiSyncOptions) {
    const clientRef = useRef<BejiSyncClient | null>(null);
    const onUpdateRef = useRef(onUpdate);
    const bejiIdRef = useRef(bejiId);

    // Update refs when props change
    useEffect(() => {
        onUpdateRef.current = onUpdate;
        bejiIdRef.current = bejiId;
    }, [onUpdate, bejiId]);

    // Initialize client
    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        clientRef.current = createBejiSyncClient();

        return () => {
            if (clientRef.current) {
                clientRef.current.disconnect();
                clientRef.current = null;
            }
        };
    }, []);

    // Connect/disconnect when bejiId changes
    useEffect(() => {
        const client = clientRef.current;
        if (!client) {
            return;
        }

        const previousBejiId = bejiIdRef.current;
        
        // If bejiId is null/undefined, disconnect if we had a previous connection
        if (!bejiId) {
            if (previousBejiId) {
                client.disconnect();
            }
            return;
        }

        // Set up update callback
        const handleUpdate = (update: { position: IPosition; target?: IPosition; walk: boolean }) => {
            if (onUpdateRef.current) {
                onUpdateRef.current(update);
            }
        };

        // Register callback
        client.onUpdate(handleUpdate);

        // Connect if bejiId changed (connect() method handles reconnection logic internally)
        if (previousBejiId !== bejiId) {
            client.connect(bejiId).catch((error) => {
                console.error("Failed to connect beji sync:", error);
            });
        }

        return () => {
            // Cleanup: remove callback and disconnect if bejiId is null or component unmounting
            client.offUpdate(handleUpdate);
            // Note: We don't disconnect here if bejiId is still valid, as the next effect run
            // will handle the connection. Only disconnect if component is truly unmounting.
            // The client's connect() method will handle disconnecting old connections.
        };
    }, [bejiId]);

    const sendUpdate = useCallback(
        async (position: IPosition, target?: IPosition, walk?: boolean) => {
            const client = clientRef.current;
            const currentBejiId = bejiIdRef.current;
            
            if (!client || !currentBejiId) {
                console.warn("Cannot send beji update: client or bejiId not available", {
                    hasClient: !!client,
                    bejiId: currentBejiId,
                });
                return;
            }

            await client.sendUpdate(position, target, walk);
        },
        []
    );

    return { sendUpdate };
}

