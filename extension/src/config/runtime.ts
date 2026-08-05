import {normalizeHTTPOrigin} from "./urls.ts";

export const API_URL = normalizeHTTPOrigin(
    import.meta.env.VITE_API_URL,
    "VITE_API_URL",
);

export const WEB_APP_URL = normalizeHTTPOrigin(
    import.meta.env.VITE_WEB_APP_URL,
    "VITE_WEB_APP_URL",
);
