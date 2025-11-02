import { createPromiseClient, PromiseClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { BejiSyncService } from "../../../src/proto/beji/v1/beji_connect";
import { BejiPositionUpdate } from "../../../src/proto/beji/v1/beji_pb";
import { Position } from "../../../src/proto/common/v1/common_pb";
import type { IPosition } from "../../../components/atoms";

export interface BejiSyncClient {
    connect(bejiId: string): Promise<void>;
    disconnect(): void;
    sendUpdate(position: IPosition, target?: IPosition, walk?: boolean): Promise<void>;
    onUpdate(callback: (update: { position: IPosition; target?: IPosition; walk: boolean }) => void): void;
    offUpdate(callback: (update: { position: IPosition; target?: IPosition; walk: boolean }) => void): void;
}

class BejiSyncClientImpl implements BejiSyncClient {
    private client: PromiseClient<typeof BejiSyncService>;
    private streamController: AbortController | null = null;
    private updateCallbacks: Array<(update: { position: IPosition; target?: IPosition; walk: boolean }) => void> = [];
    private bejiId: string | null = null;
    private isConnected: boolean = false;
    private streamIterator: AsyncIterable<BejiPositionUpdate> | null = null;
    private streamWriter: { write: (update: BejiPositionUpdate) => Promise<void> } | null = null;

    constructor() {
        const transport = createConnectTransport({
            baseUrl: typeof window !== "undefined" ? window.location.origin : "",
            credentials: "include", // Include cookies for authentication
            useBinaryFormat: false, // Use JSON for easier debugging
        });

        this.client = createPromiseClient(BejiSyncService, transport);
    }

    async connect(bejiId: string): Promise<void> {
        if (this.isConnected && this.bejiId === bejiId) {
            return;
        }

        this.disconnect();
        this.bejiId = bejiId;
        this.streamController = new AbortController();

        try {
            // Create initial update with beji ID to establish connection
            const initialUpdate = new BejiPositionUpdate({
                bejiId,
            });

            // Start bidirectional stream using Connect RPC
            // Note: Connect handles bidirectional streaming via async iterables
            const stream = this.client.syncBejiPosition(initialUpdate, {
                signal: this.streamController.signal,
            });

            this.streamIterator = stream;
            this.isConnected = true;

            // Start reading from stream in background
            this.readStream(stream);

            // For sending updates, we'll need to create new streams or use a different approach
            // Connect bidirectional streaming works by the client sending messages through the request stream
            // and receiving through the response stream. We need to handle this properly.
        } catch (error) {
            if (error instanceof Error && error.name !== "AbortError") {
                console.error("Beji sync connection error:", error);
            }
            this.isConnected = false;
        }
    }

    private async readStream(stream: AsyncIterable<BejiPositionUpdate>): Promise<void> {
        try {
            for await (const update of stream) {
                if (!this.isConnected) break;

                if (update.bejiId === this.bejiId && update.position) {
                    const position: IPosition = {
                        x: update.position.x,
                        y: update.position.y,
                    };
                    const target: IPosition | undefined = update.target
                        ? { x: update.target.x, y: update.target.y }
                        : undefined;

                    // Notify all callbacks
                    this.notifyCallbacks({
                        position,
                        target,
                        walk: update.walk ?? true,
                    });
                }
            }
        } catch (error) {
            if (error instanceof Error && error.name !== "AbortError") {
                console.error("Error reading beji sync stream:", error);
            }
        } finally {
            this.isConnected = false;
        }
    }

    disconnect(): void {
        if (this.streamController) {
            this.streamController.abort();
            this.streamController = null;
        }
        this.bejiId = null;
        this.isConnected = false;
        this.streamIterator = null;
        this.streamWriter = null;
    }

    async sendUpdate(position: IPosition, target?: IPosition, walk?: boolean): Promise<void> {
        if (!this.bejiId || !this.isConnected) {
            console.warn("Cannot send beji update: not connected", {
                bejiId: this.bejiId,
                isConnected: this.isConnected,
            });
            return;
        }

        try {
            // Create update message
            const update = new BejiPositionUpdate({
                bejiId: this.bejiId,
                position: new Position({
                    x: position.x,
                    y: position.y,
                }),
                target: target
                    ? new Position({
                          x: target.x,
                          y: target.y,
                      })
                    : undefined,
                walk: walk !== undefined ? walk : true,
            });

            // For Connect bidirectional streaming, we need to send through a new stream
            // Since we can't write to an existing stream, we'll create a new one for each update
            // This is a limitation - ideally we'd maintain a persistent bidirectional stream
            // For now, we'll use a simple approach: create a new stream for sending updates
            const streamController = new AbortController();
            const stream = this.client.syncBejiPosition(update, {
                signal: streamController.signal,
            });

            // Read the response but don't block
            (async () => {
                try {
                    for await (const response of stream) {
                        // Response is handled by the main stream reader
                        if (response.position) {
                            const pos: IPosition = {
                                x: response.position.x,
                                y: response.position.y,
                            };
                            const tgt = response.target
                                ? { x: response.target.x, y: response.target.y }
                                : undefined;

                            this.notifyCallbacks({
                                position: pos,
                                target: tgt,
                                walk: response.walk ?? true,
                            });
                        }
                    }
                } catch (error) {
                    if (error instanceof Error && error.name !== "AbortError") {
                        console.error("Error in update stream:", error);
                    }
                } finally {
                    streamController.abort();
                }
            })();
        } catch (error) {
            console.error("Error sending beji update:", error);
        }
    }

    onUpdate(callback: (update: { position: IPosition; target?: IPosition; walk: boolean }) => void): void {
        this.updateCallbacks.push(callback);
    }

    offUpdate(callback: (update: { position: IPosition; target?: IPosition; walk: boolean }) => void): void {
        const index = this.updateCallbacks.indexOf(callback);
        if (index > -1) {
            this.updateCallbacks.splice(index, 1);
        }
    }

    private notifyCallbacks(update: { position: IPosition; target?: IPosition; walk: boolean }): void {
        this.updateCallbacks.forEach((callback) => {
            try {
                callback(update);
            } catch (error) {
                console.error("Error in beji sync callback:", error);
            }
        });
    }
}

export function createBejiSyncClient(): BejiSyncClient {
    return new BejiSyncClientImpl();
}
