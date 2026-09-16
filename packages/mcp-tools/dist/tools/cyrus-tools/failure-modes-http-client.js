export function createFetchFailureModesClient(options) {
    const fetchImpl = options.fetchImpl ?? globalThis.fetch;
    const timeoutMs = options.timeoutMs ?? 15_000;
    const url = `${options.baseUrl.replace(/\/+$/, "")}/api/failure-modes`;
    return {
        async postFailureMode(input) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeoutMs);
            try {
                const res = await fetchImpl(url, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${options.apiKey}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        sessionId: input.sessionId,
                        category: input.category,
                        recap: input.recap,
                        userQuoteSnippet: input.userQuoteSnippet,
                        agentFailureSnippet: input.agentFailureSnippet,
                        ...(input.sessionSource
                            ? { sessionSource: input.sessionSource }
                            : {}),
                        ...(input.runnerSessionId
                            ? { runnerSessionId: input.runnerSessionId }
                            : {}),
                        ...(input.runnerType ? { runnerType: input.runnerType } : {}),
                        ...(input.sourceIssueIdentifier
                            ? { sourceIssueIdentifier: input.sourceIssueIdentifier }
                            : {}),
                        ...(input.workspacePath
                            ? { workspacePath: input.workspacePath }
                            : {}),
                    }),
                    signal: controller.signal,
                });
                const text = await res.text();
                let parsed = null;
                try {
                    parsed = text ? JSON.parse(text) : null;
                }
                catch {
                    parsed = null;
                }
                if (!res.ok) {
                    const errMsg = parsed?.error ??
                        text.slice(0, 500) ??
                        res.statusText;
                    return { ok: false, status: res.status, error: errMsg };
                }
                // Server intentionally returns no body identifiers — see
                // log-failure-mode.ts. We just acknowledge the 2xx.
                return { ok: true };
            }
            catch (err) {
                return {
                    ok: false,
                    status: 0,
                    error: err instanceof Error ? err.message : String(err),
                };
            }
            finally {
                clearTimeout(timer);
            }
        },
    };
}
//# sourceMappingURL=failure-modes-http-client.js.map