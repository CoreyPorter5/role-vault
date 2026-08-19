import {normalizeHTTPOrigin} from "./urls.ts";
import {normalizeAuthCookieName} from "../utils/authCookies.ts";

export const WEB_APP_URL = normalizeHTTPOrigin(
    import.meta.env.VITE_WEB_APP_URL,
    "VITE_WEB_APP_URL",
);

export const AUTH_COOKIE_NAME = normalizeAuthCookieName(
    import.meta.env.VITE_AUTH_COOKIE_NAME,
);
