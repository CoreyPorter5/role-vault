import {captureAppError} from "@/lib/sentry/captureAppError";
import {safeStripeRedirectUrl} from "@/lib/stripe/redirect";

export async function createStripeCheckoutSession(token: string | null) {
    if (!token) {
        console.error("Error: You need to be logged in");
        return
    }
    try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL_PREFIX}/api/v1/billing/create-checkout-session`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        })
        if (!response.ok) {
            const error = await response.text();
            captureAppError({
                message: "Failed to get stripe checkout redirect URL",
                area: "create_stripe_checkout_session",
                action: "get_stripe_checkout_redirect_url",
                endpoint: "/api/v1/billing/create-checkout-session",
                status: response.status,
                statusText: response.statusText,
                extra: {
                    error,
                }
            })
            console.error("Failed to create checkout session: ", error)
            return
        }

        const data: { url?: unknown } = await response.json();
        const redirectUrl = safeStripeRedirectUrl(data.url);
        if (!redirectUrl) {
            captureAppError({
                message: "Stripe redirect checkout URL is empty",
                area: "create_stripe_checkout_session",
                action: "get_stripe_checkout_redirect_url",
                endpoint: "/api/v1/billing/create-checkout-session",
                status: response.status,
                statusText: response.statusText,
                forceCapture: true,
                extra: {
                    hasCheckoutUrl: typeof data.url === "string" && Boolean(data.url),
                }
            })
            console.error("No redirect URL returned from backend")
            return
        }
        window.location.href = redirectUrl
    } catch (error) {
        captureAppError({
            message: "Unexpected error whilst trying to get stripe checkout redirect URL",
            error,
            area: "create_stripe_checkout_session",
            action: "get_stripe_checkout_redirect_url",
            endpoint: "/api/v1/billing/create-checkout-session",
        })
        console.error("Error creating stripe checkout session: ", error)
    }
}


export async function createStripeUserPortalSession(token: string | null) {
    if (!token) {
        console.error("Error: You need to be logged in");
        return
    }
    try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL_PREFIX}/api/v1/billing/create-portal-session`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        })
        if (!response.ok) {
            const error = await response.text();
            captureAppError({
                message: "Failed to get stripe portal redirect URL",
                area: "create_stripe_portal_session",
                action: "get_stripe_portal_redirect_url",
                endpoint: "/api/v1/billing/create-portal-session",
                status: response.status,
                statusText: response.statusText,
                extra: {
                    error,
                }
            })
            console.error("Failed to create portal session: ", error)
            return
        }

        const data: { url?: unknown } = await response.json();
        const redirectUrl = safeStripeRedirectUrl(data.url);
        if (!redirectUrl) {
            captureAppError({
                message: "Stripe redirect portal URL is empty",
                area: "create_stripe_portal_session",
                action: "get_stripe_portal_redirect_url",
                endpoint: "/api/v1/billing/create-portal-session",
                status: response.status,
                statusText: response.statusText,
                forceCapture: true,
                extra: {
                    hasPortalUrl: typeof data.url === "string" && Boolean(data.url),
                }
            })
            console.error("No redirect URL returned from backend")
            return
        }
        window.location.href = redirectUrl
    } catch (error) {
        captureAppError({
            message: "Unexpected error whilst trying to get stripe portal redirect URL",
            error,
            area: "create_stripe_portal_session",
            action: "get_stripe_portal_redirect_url",
            endpoint: "/api/v1/billing/create-portal-session",
        })
        console.error("Error creating stripe portal session: ", error)
    }


}
