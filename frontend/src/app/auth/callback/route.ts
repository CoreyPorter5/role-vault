import {NextResponse} from 'next/server'
import {createClient} from "@/lib/supabase/server";
import {captureAppError} from "@/lib/sentry/captureAppError";
import {
    safeOAuthNextPath,
    trustedAuthRedirectOrigin,
} from "@/lib/auth/callback";
import {ensureUserProfile} from "@/lib/auth/profile";
import {analyticsEvents} from "@/lib/analytics/events";
import {captureServerAnalytics} from "@/lib/analytics/server";

// The client you created from the Server-Side Auth instructions


export async function GET(request: Request) {
    const {searchParams, origin} = new URL(request.url)
    const code = searchParams.get('code')
    const next = safeOAuthNextPath(searchParams.get('next'))
    const isRegistration = searchParams.get('intent') === 'register'
    const redirectOrigin = trustedAuthRedirectOrigin(origin)

    if (code) {
        const supabase = await createClient()
        const {data, error} = await supabase.auth.exchangeCodeForSession(code)
        if (error || !data.user) {
            return NextResponse.redirect(new URL('/register/?error=google_sign_in_failed', redirectOrigin))
        }

        const profileError = await ensureUserProfile(supabase, data.user)

        if (profileError) {
            captureAppError({
                code: "WEB_AUTH_PROFILE_PROVISION_FAILED",
                message: "OAuth succeeded but profile provisioning failed",
                error: new Error("OAuth profile provisioning failed"),
                area: "auth",
                action: "provision_oauth_profile",
                extra: {upstreamErrorCode: profileError.code},
            });
            return NextResponse.redirect(new URL('/register?error=profile_creation_failed', redirectOrigin))
        }
        if (isRegistration) {
            await captureServerAnalytics(data.user.id, analyticsEvents.registrationCompleted, {
                method: "google",
            });
        }
        return NextResponse.redirect(new URL(next, redirectOrigin))

    }

    // return the user to an error page with instructions
    return NextResponse.redirect(new URL('/register/?error=missing_oauth_code', redirectOrigin))
}
