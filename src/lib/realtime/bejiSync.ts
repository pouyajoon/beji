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
    private updateQueue: BejiPositionUpdate[] = [];
    private streamIterator: AsyncIterable<BejiPositionUpdate> | null = null;

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
            const self = this;
            // Create an async generator that yields updates from the queue
            async function* createUpdateStream(
                initialBejiId: string
            ): AsyncGenerator<BejiPositionUpdate> {
                // Send initial connection message
                yield new BejiPositionUpdate({ bejiId: initialBejiId });

                // Keep the stream alive and yield updates from queue
                while (self.isConnected && self.streamController) {
                    if (self.updateQueue.length > 0) {
                        const update = self.updateQueue.shift();
                        if (update) {
                            yield update;
                        }
                    } else {
                        // Small delay to prevent tight loop
                        await new Promise((resolve) => setTimeout(resolve, 10));
                    }
                }
            }

            // Start bidirectional stream
            const requestStream = createUpdateStream(bejiId);
            const responseStream = this.client.syncBejiPosition(requestStream, {
                signal: this.streamController.signal,
            });

            this.streamIterator = responseStream;
            this.isConnected = true;

            // Start reading from stream in background
            this.readStream(responseStream);
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
        this.updateQueue = [];
    }

    async sendUpdate(position: IPosition, target?: IPosition, walk?: boolean): Promise<void> {
        if (!this.bejiId || !this.isConnected) {
            console.warn("Cannot send beji update: not connected", {
                bejiId: this.bejiId,
                isConnected: this.isConnected,
            });
            return;
        }

        // Create update message and queue it
        // The update stream generator will pick it up and send it
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

        this.updateQueue.push(update);
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
