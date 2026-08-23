import {
    BrowserClient,
    defaultStackParser,
    getDefaultIntegrations,
    makeFetchTransport,
    Scope,
} from "@sentry/browser";
import {scrubExtensionEvent} from "./privacy.ts";
import {EXTENSION_VERSION} from "../../src/config/version.ts";

export type ExtensionRuntime = "popup" | "background";

let extensionScope: Scope | null = null;
let extensionClient: BrowserClient | null = null;

export function initializeExtensionSentry(runtime: ExtensionRuntime): void {
    if (extensionScope) return;

    const dsn = import.meta.env.VITE_SENTRY_DSN;
    if (!import.meta.env.PROD || !dsn) return;

    const integrations = getDefaultIntegrations({}).filter((integration) =>
        ["InboundFilters", "FunctionToString", "Dedupe"].includes(integration.name)
    );
    const release = import.meta.env.VITE_SENTRY_RELEASE ||
        `rolevault-extension@${EXTENSION_VERSION}`;

    const client = new BrowserClient({
        dsn,
        transport: makeFetchTransport,
        stackParser: defaultStackParser,
        integrations,
        environment: import.meta.env.MODE,
        release,
        tracesSampleRate: 0,
        sendDefaultPii: false,
        beforeSend: scrubExtensionEvent,
    });
    const scope = new Scope();
    scope.setClient(client);
    scope.setTags({
        app: "rolevault-extension",
        runtime,
        extension_version: EXTENSION_VERSION,
    });
    client.init();

    extensionClient = client;
    extensionScope = scope;
}

export function getExtensionSentryScope(): Scope | null {
    return extensionScope?.clone() ?? null;
}

export async function flushExtensionSentry(timeout = 750): Promise<boolean> {
    if (!extensionClient) return false;
    return await extensionClient.flush(timeout);
}
