/// <reference types="chrome" />

export type ContentDiagnosticCode =
    | "EXT_CONTENT_SEEK_SCHEMA"
    | "EXT_CONTENT_SCRAPE_UNEXPECTED"
    | "EXT_CONTENT_SYNC_UNEXPECTED";

export function reportContentDiagnostic(code: ContentDiagnosticCode): void {
    chrome.runtime.sendMessage(
        {
            action: "REPORT_DIAGNOSTIC",
            payload: {code},
        },
        () => {
            // Extension updates can invalidate the context while SEEK remains open.
            void chrome.runtime.lastError;
        },
    );
}
