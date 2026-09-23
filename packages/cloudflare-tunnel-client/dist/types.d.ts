/**
 * Event emitted by CloudflareTunnelClient
 */
export interface CloudflareTunnelClientEvents {
    connect: () => void;
    connected: (connection: any) => void;
    disconnect: (reason: string) => void;
    error: (error: Error) => void;
    ready: (tunnelUrl: string) => void;
}
//# sourceMappingURL=types.d.ts.map