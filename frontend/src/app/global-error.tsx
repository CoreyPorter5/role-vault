"use client";

import NextError from "next/error";
import { useEffect } from "react";
import {captureAppError} from "@/lib/sentry/captureAppError";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    captureAppError({
      code: "WEB_APP_UNHANDLED_RENDER_FAILED",
      message: "Unhandled application render error",
      error,
      area: "app_router",
      action: "render",
    });
  }, [error]);

  return (
    <html lang="en">
      <body>
        {/* `NextError` is the default Next.js error page component. Its type
        definition requires a `statusCode` prop. However, since the App Router
        does not expose status codes for errors, we simply pass 0 to render a
        generic error message. */}
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
