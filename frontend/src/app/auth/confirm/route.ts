import type {EmailOtpType} from "@supabase/supabase-js";
import {NextResponse, type NextRequest} from "next/server";
import {createClient} from "@/lib/supabase/server";
import {ensureUserProfile} from "@/lib/auth/profile";
import {safeOAuthNextPath, trustedAuthRedirectOrigin} from "@/lib/auth/callback";
import {captureAppError} from "@/lib/sentry/captureAppError";
import {analyticsEvents} from "@/lib/analytics/events";
import {captureServerAnalytics} from "@/lib/analytics/server";

export async function GET(request: NextRequest) {
    const {searchParams, origin} = request.nextUrl;
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type") as EmailOtpType | null;
    const next = safeOAuthNextPath(searchParams.get("next") ?? "/dashboard");
    const redirectOrigin = trustedAuthRedirectOrigin(origin);

    if (tokenHash && type) {
        const supabase = await createClient();
        const {data, error} = await supabase.auth.verifyOtp({
            type,
            token_hash: tokenHash,
        });

        if (!error && data.user) {
            const profileError = await ensureUserProfile(supabase, data.user);
            if (!profileError) {
                await captureServerAnalytics(data.user.id, analyticsEvents.registrationCompleted, {
                    method: "email",
                });
                return NextResponse.redirect(new URL(next, redirectOrigin));
            }

            captureAppError({
                code: "WEB_AUTH_PROFILE_PROVISION_FAILED",
                message: "Email confirmation succeeded but profile provisioning failed",
                error: new Error("Email confirmation profile provisioning failed"),
                area: "auth",
                action: "provision_confirmed_email_profile",
                extra: {upstreamErrorCode: profileError.code},
            });
        }
    }

    return NextResponse.redirect(new URL("/login?error=email_confirmation_failed", redirectOrigin));
}
