export type SyncButtonState = "idle" | "loading" | "success" | "duplicate" | "error";

type SyncButtonTarget = Pick<
    HTMLButtonElement,
    "dataset" | "setAttribute" | "textContent"
>;

export function updateSyncButton(
    button: SyncButtonTarget,
    label: string,
    state: SyncButtonState = "idle",
): void {
    button.textContent = label;
    button.dataset.state = state;
    button.setAttribute("aria-busy", state === "loading" ? "true" : "false");
}
