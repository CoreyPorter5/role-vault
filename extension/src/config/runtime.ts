import {normalizeHTTPOrigin} from "./urls.ts";

export const WEB_APP_URL = normalizeHTTPOrigin(
    import.meta.env.VITE_WEB_APP_URL,
    "VITE_WEB_APP_URL",
);
