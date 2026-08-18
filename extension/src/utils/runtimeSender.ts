export type RuntimeSenderIdentity = {
    id?: string;
    url?: string;
};

export function isTrustedExtensionPageSender(
    sender: RuntimeSenderIdentity,
    runtimeId: string,
): boolean {
    if (sender.id !== runtimeId || !sender.url) return false;

    try {
        const url = new URL(sender.url);
        return url.protocol === "chrome-extension:" && url.hostname === runtimeId;
    } catch {
        return false;
    }
}

export function isTrustedSeekContentSender(
    sender: RuntimeSenderIdentity,
    runtimeId: string,
): boolean {
    if (sender.id !== runtimeId || !sender.url) return false;

    try {
        const url = new URL(sender.url);
        return url.protocol === "https:" && url.hostname === "au.seek.com";
    } catch {
        return false;
    }
}
