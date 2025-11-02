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
        if (!client || !bejiId) {
            return;
        }

        const handleUpdate = (update: { position: IPosition; target?: IPosition; walk: boolean }) => {
            if (onUpdateRef.current) {
                onUpdateRef.current(update);
            }
        };

        client.onUpdate(handleUpdate);
        client.connect(bejiId);

        return () => {
            client.offUpdate(handleUpdate);
            client.disconnect();
        };
    }, [bejiId]);

    const sendUpdate = useCallback(
        async (position: IPosition, target?: IPosition, walk?: boolean) => {
            if (clientRef.current && bejiId) {
                await clientRef.current.sendUpdate(position, target, walk);
            }
        },
        [bejiId]
    );

    return { sendUpdate };
}

