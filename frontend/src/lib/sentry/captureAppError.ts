import * as Sentry from "@sentry/nextjs"


type CaptureAppErrorProps = {
    message: string;
    error?: unknown;
    area: string;
    action: string;
    endpoint?: string;
    status?: string | number;
    statusText?: string;
    extra?: Record<string, unknown>
}

export function captureAppError({message, error, area, action, endpoint, status, statusText, extra}: CaptureAppErrorProps){
    Sentry.withScope((scope) => {
        scope.setTag("area", area);
        scope.setTag("action", action)
        if(endpoint){
            scope.setTag("endpoint", endpoint)
        }
        scope.setExtras({
            endpoint,
            status,
            statusText,
            ...extra
        });
        if(error instanceof Error){
            Sentry.captureException(error)
        }else{
            Sentry.captureMessage(message, "error")
        }
    })
}