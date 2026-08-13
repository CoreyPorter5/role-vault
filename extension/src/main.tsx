import "../instrument.ts"
import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import {captureAppError} from "../lib/sentry/captureAppError.ts";
import {flushExtensionSentry} from "../lib/sentry/client.ts";

window.addEventListener("error", (event) => {
    captureAppError({
        code: "EXT_POPUP_UNHANDLED",
        message: "Unhandled popup window error",
        error: event.error instanceof Error ? event.error : new Error("Popup window error"),
        area: "popup",
        action: "unhandled_error",
    });
    void flushExtensionSentry();
});

window.addEventListener("unhandledrejection", (event) => {
    captureAppError({
        code: "EXT_POPUP_UNHANDLED",
        message: "Unhandled popup promise rejection",
        error: event.reason instanceof Error ? event.reason : new Error("Popup promise rejection"),
        area: "popup",
        action: "unhandled_rejection",
    });
    void flushExtensionSentry();
});

createRoot(document.getElementById('root')!, {
    onUncaughtError: (error) => {
        captureAppError({
            code: "EXT_POPUP_REACT_UNCAUGHT",
            message: "Uncaught popup render error",
            error,
            area: "popup",
            action: "render",
        });
    },
    onRecoverableError: (error) => {
        captureAppError({
            code: "EXT_POPUP_REACT_RECOVERABLE",
            message: "Recoverable popup render error",
            error,
            area: "popup",
            action: "recover_render",
        });
    },
}).render(
    <StrictMode>
        <App/>
    </StrictMode>,
)
