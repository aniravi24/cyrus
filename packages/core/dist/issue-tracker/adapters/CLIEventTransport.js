/**
 * CLI/in-memory implementation of IAgentEventTransport.
 *
 * This transport provides an in-memory event emitter for testing purposes.
 * Unlike Linear's webhook-based transport, this doesn't register HTTP endpoints
 * and instead provides methods to manually trigger events for testing.
 *
 * @module issue-tracker/adapters/CLIEventTransport
 */
import { EventEmitter } from "node:events";
/**
 * CLI implementation of IAgentEventTransport.
 *
 * This class provides an in-memory event emitter for testing agent events
 * without requiring HTTP webhooks. Events can be manually triggered using
 * the `emitEvent` method.
 *
 * @example
 * ```typescript
 * const transport = new CLIEventTransport({
 *   platform: 'cli',
 *   fastifyServer: server
 * });
 *
 * // Register (no-op for CLI)
 * transport.register();
 *
 * // Listen for events
 * transport.on('event', (event) => {
 *   console.log('Received event:', event.action);
 * });
 *
 * // Manually trigger an event
 * transport.emitEvent({
 *   action: 'AgentSessionEvent.created',
 *   agentSession: { id: 'session-1' }
 * });
 * ```
 */
export class CLIEventTransport extends EventEmitter {
    /**
     * Create a new CLIEventTransport.
     *
     * @param config - CLI transport configuration
     */
    constructor(config) {
        super();
        // Config stored implicitly via closure (not used in current implementation)
        void config;
    }
    /**
     * Register HTTP endpoints (no-op for CLI transport).
     *
     * The CLI transport doesn't use HTTP webhooks, so this method
     * does nothing. Events are triggered manually via `emitEvent`.
     */
    register() {
        // No-op for CLI transport
        // Events are triggered manually via emitEvent()
    }
    /**
     * Register an event listener.
     *
     * @param event - Event name to listen for
     * @param listener - Callback function to handle the event
     */
    on(event, listener) {
        return super.on(event, listener);
    }
    /**
     * Remove all event listeners.
     */
    removeAllListeners() {
        return super.removeAllListeners();
    }
    /**
     * Manually emit an agent event (for testing).
     *
     * This method allows tests to manually trigger agent events
     * without requiring HTTP webhooks.
     *
     * @param event - The agent event to emit
     *
     * @example
     * ```typescript
     * transport.emitEvent({
     *   action: 'AgentSessionEvent.created',
     *   agentSession: { id: 'session-1', status: 'active' }
     * });
     * ```
     */
    emitEvent(event) {
        this.emit("event", event);
    }
    /**
     * Manually emit an internal message on the unified message bus.
     *
     * Used by CLI/F1 code paths that need to deliver an `InternalMessage`
     * (for example an `IssueStateChangeMessage` when an issue is terminated
     * via the F1 RPC) without going through HTTP webhooks.
     *
     * @param message - The internal message to emit
     */
    emitMessage(message) {
        this.emit("message", message);
    }
    /**
     * Manually emit an error (for testing).
     *
     * @param error - The error to emit
     */
    emitError(error) {
        this.emit("error", error);
    }
}
//# sourceMappingURL=CLIEventTransport.js.map