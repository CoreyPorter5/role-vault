const CHROME_EXTENSION_ID_PATTERN = /^[a-p]{32}$/;

export function chromeExtensionOrigin(extensionID: string | undefined): string | null {
    const normalizedID = extensionID?.trim() ?? "";
    if (!CHROME_EXTENSION_ID_PATTERN.test(normalizedID)) return null;
    return `chrome-extension://${normalizedID}`;
}

export function isAllowedExtensionRequest({
    configuredExtensionID,
    requestOrigin,
    suppliedExtensionID,
}: {
    configuredExtensionID: string | undefined;
    requestOrigin: string | null;
    suppliedExtensionID: string | null;
}): boolean {
    const expectedOrigin = chromeExtensionOrigin(configuredExtensionID);
    if (!expectedOrigin) return false;

    const extensionIDMatches = suppliedExtensionID === configuredExtensionID?.trim();
    if (!extensionIDMatches) return false;

    // Chromium extension workers may omit Origin for privileged cross-origin
    // requests. Browser pages still send an Origin and must match; preflights
    // remain restricted to the configured extension origin below.
    return requestOrigin === null || requestOrigin === expectedOrigin;
}

export function isAllowedExtensionPreflight({
    configuredExtensionID,
    requestOrigin,
}: {
    configuredExtensionID: string | undefined;
    requestOrigin: string | null;
}): boolean {
    const expectedOrigin = chromeExtensionOrigin(configuredExtensionID);
    return Boolean(expectedOrigin && requestOrigin === expectedOrigin);
}
