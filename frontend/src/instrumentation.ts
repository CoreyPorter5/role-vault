import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = (...args: Parameters<typeof Sentry.captureRequestError>) => {
  Sentry.withScope((scope) => {
    scope.setTag("error.code", "WEB_APP_REQUEST_FAILED");
    scope.setTag("surface", "web");
    scope.setTag("area", "app_router");
    scope.setTag("action", "request");
    Sentry.captureRequestError(...args);
  });
};
