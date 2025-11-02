import type { IPosition } from "../../../components/atoms";

export interface BejiSyncClient {
    connect(bejiId: string): Promise<void>;
    disconnect(): void;
    sendUpdate(position: IPosition, target?: IPosition, walk?: boolean): Promise<void>;
    onUpdate(callback: (update: { position: IPosition; target?: IPosition; walk: boolean }) => void): void;
    offUpdate(callback: (update: { position: IPosition; target?: IPosition; walk: boolean }) => void): void;
}

class BejiSyncClientImpl implements BejiSyncClient {
    private bejiId: string | null = null;
    private updateCallbacks: Array<(update: { position: IPosition; target?: IPosition; walk: boolean }) => void> = [];
    private pollInterval: NodeJS.Timeout | null = null;
    private lastUpdateTime: number = 0;
    private pendingUpdate: { position: IPosition; target?: IPosition; walk?: boolean } | null = null;
    private isConnected: boolean = false;

    async connect(bejiId: string): Promise<void> {
        if (this.isConnected && this.bejiId === bejiId) {
            return;
        }

        this.disconnect();
        this.bejiId = bejiId;
        this.isConnected = true;
        this.lastUpdateTime = Date.now();

        // Send updates every 200ms (5 times per second)
        this.pollInterval = setInterval(() => {
            this.sendPendingUpdate();
        }, 200);
    }

    disconnect(): void {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
        this.bejiId = null;
        this.isConnected = false;
        this.pendingUpdate = null;
    }

    async sendUpdate(position: IPosition, target?: IPosition, walk?: boolean): Promise<void> {
        if (!this.bejiId || !this.isConnected) {
            return;
        }

        // Store pending update (will be sent on next poll interval)
        this.pendingUpdate = { position, target, walk };
    }

    private async sendPendingUpdate(): Promise<void> {
        if (!this.bejiId || !this.pendingUpdate) {
            return;
        }

        const update = this.pendingUpdate;
        this.pendingUpdate = null;

        try {
            const response = await fetch("/api/websocket/beji-sync", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    type: "update",
                    bejiId: this.bejiId,
                    position: update.position,
                    target: update.target,
                    walk: update.walk,
                }),
            });

            if (!response.ok) {
                console.error("Failed to sync beji position:", response.statusText);
                return;
            }

            const data = await response.json();
            
            // If server returns updated position, notify callbacks
            if (data.position) {
                this.notifyCallbacks({
                    position: data.position,
                    target: data.target,
                    walk: data.walk ?? true,
                });
            }
        } catch (error) {
            console.error("Error syncing beji position:", error);
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
