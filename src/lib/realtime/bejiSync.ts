import type { IPosition } from "../../../components/atoms";

export interface BejiSyncClient {
    connect(bejiId: string): Promise<void>;
    disconnect(): void;
    sendUpdate(position: IPosition, target?: IPosition, walk?: boolean): Promise<void>;
    onUpdate(callback: (update: { position: IPosition; target?: IPosition; walk: boolean }) => void): void;
    offUpdate(callback: (update: { position: IPosition; target?: IPosition; walk: boolean }) => void): void;
}

class BejiSyncClientImpl implements BejiSyncClient {
    private ws: WebSocket | null = null;
    private updateCallbacks: Array<(update: { position: IPosition; target?: IPosition; walk: boolean }) => void> = [];
    private bejiId: string | null = null;
    private isConnected: boolean = false;
    private updateQueue: Array<{ position: IPosition; target?: IPosition; walk?: boolean }> = [];
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private reconnectDelay: number = 1000;
    private reconnectTimer: NodeJS.Timeout | null = null;

    constructor() {
        // WebSocket will be created on connect
    }

    async connect(bejiId: string): Promise<void> {
        // If already connected to the same bejiId with an open connection, no-op
        if (this.isConnected && this.bejiId === bejiId && this.ws?.readyState === WebSocket.OPEN) {
            console.log(`Already connected to beji ${bejiId}, skipping reconnect`);
            return;
        }

        // If connecting to a different bejiId or connection is not open, disconnect first
        if (this.ws && (this.bejiId !== bejiId || this.ws.readyState !== WebSocket.OPEN)) {
            console.log(`Disconnecting previous connection (bejiId: ${this.bejiId}, state: ${this.ws?.readyState})`);
            this.disconnect();
        }

        this.bejiId = bejiId;

        return this.establishWebSocketConnection();
    }

    private async establishWebSocketConnection(): Promise<void> {
        // Prevent multiple simultaneous connection attempts
        if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
            console.log("WebSocket connection already in progress or open, skipping new connection attempt");
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            try {
                // Use environment variable for WebSocket URL, fallback to same host
                const wsBaseUrl = import.meta.env.VITE_WS_URL;
                let wsUrl: string;
                
                if (wsBaseUrl) {
                    wsUrl = `${wsBaseUrl}/api/ws/beji-sync`;
                } else {
                    // Fallback to same host (for local development or same-domain deployment)
                    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
                    wsUrl = `${protocol}//${window.location.host}/api/ws/beji-sync`;
                }

                console.log(`Establishing WebSocket connection to ${wsUrl} for beji ${this.bejiId}`);
                this.ws = new WebSocket(wsUrl);

                this.ws.onopen = () => {
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    console.log("Beji sync WebSocket connected");

                    // Send initial connection message with bejiId
                    this.sendMessage({
                        type: "connect",
                        bejiId: this.bejiId!,
                    });

                    resolve();
                };

                this.ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);

                        if (data.type === "connected") {
                            console.log(`Beji ${data.bejiId} connected successfully`);
                            // Send any queued updates
                            this.flushQueue();
                        } else if (data.type === "update") {
                            this.handleIncomingUpdate(data);
                        } else if (data.type === "pong") {
                            // Keep-alive response
                        } else if (data.error) {
                            console.error("WebSocket error:", data.error, data.message);
                        }
                    } catch (error) {
                        console.error("Error parsing WebSocket message:", error);
                    }
                };

                this.ws.onerror = (error) => {
                    console.error("WebSocket error:", error);
                    reject(error);
                };

                this.ws.onclose = () => {
                    this.isConnected = false;
                    console.log("Beji sync WebSocket closed");

                    // Attempt to reconnect if not intentionally disconnected
                    if (this.bejiId && this.reconnectAttempts < this.maxReconnectAttempts) {
                        this.reconnectAttempts++;
                        const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
                        console.log(`Reconnecting in ${delay}ms... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
                        
                        this.reconnectTimer = setTimeout(() => {
                            this.establishWebSocketConnection().catch(console.error);
                        }, delay);
                    } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                        console.error("Max reconnection attempts reached");
                    }
                };
            } catch (error) {
                console.error("Error establishing WebSocket connection:", error);
                reject(error);
            }
        });
    }

    private sendMessage(message: Record<string, unknown>): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.warn("Cannot send message: WebSocket not open", message);
        }
    }

    private handleIncomingUpdate(data: {
        bejiId?: string;
        position?: { x: number; y: number };
        target?: { x: number; y: number };
        walk?: boolean;
    }): void {
        if (data.bejiId === this.bejiId && data.position) {
            const position: IPosition = {
                x: data.position.x,
                y: data.position.y,
            };
            const target: IPosition | undefined = data.target
                ? { x: data.target.x, y: data.target.y }
                : undefined;

            this.notifyCallbacks({
                position,
                target,
                walk: data.walk ?? true,
            });
        }
    }

    private flushQueue(): void {
        while (this.updateQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
            const update = this.updateQueue.shift();
            if (update) {
                this.sendMessage({
                    type: "update",
                    bejiId: this.bejiId!,
                    position: update.position,
                    target: update.target,
                    walk: update.walk,
                });
            }
        }
    }

    disconnect(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.bejiId = null;
        this.isConnected = false;
        this.updateQueue = [];
        this.reconnectAttempts = 0;
    }

    async sendUpdate(position: IPosition, target?: IPosition, walk?: boolean): Promise<void> {
        if (!this.bejiId) {
            return;
        }

        // Queue the update
        this.updateQueue.push({ position, target, walk });

        // If connected, send immediately; otherwise it will be sent on reconnect
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.flushQueue();
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
