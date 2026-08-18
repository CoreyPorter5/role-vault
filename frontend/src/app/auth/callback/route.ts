import {NextResponse} from 'next/server'
import {createClient} from "@/lib/supabase/server";
import {captureAppError} from "@/lib/sentry/captureAppError";
import {
    isDuplicateProfileError,
    profileNamesFromMetadata,
    safeOAuthNextPath,
    trustedAuthRedirectOrigin,
} from "@/lib/auth/callback";

// The client you created from the Server-Side Auth instructions


export async function GET(request: Request) {
    const {searchParams, origin} = new URL(request.url)
    const code = searchParams.get('code')
    const next = safeOAuthNextPath(searchParams.get('next'))
    const redirectOrigin = trustedAuthRedirectOrigin(origin)

    if (code) {
        const supabase = await createClient()
        const {data, error} = await supabase.auth.exchangeCodeForSession(code)
        if (error || !data.user) {
            return NextResponse.redirect(new URL('/register/?error=google_sign_in_failed', redirectOrigin))
        }

        const user = data.user
        const {firstName, lastName} = profileNamesFromMetadata(user.user_metadata, user.email)
        // Billing periods and limits use trusted database defaults. Browser
        // sessions may only provide identity/profile fields.
        const {data: existingProfile, error: profileLookupError} = await supabase
            .from("profiles")
            .select("user_id")
            .eq("user_id", user.id)
            .maybeSingle()
        let profileError = profileLookupError
        if (!profileError && !existingProfile) {
            const insertResult = await supabase.from("profiles").insert({
                user_id: user.id,
                email: user.email ?? "",
                first_name: firstName,
                last_name: lastName,
            })
            // Concurrent callbacks may both observe no row. The unique constraint
            // makes one insert win; the other callback can continue safely.
            profileError = isDuplicateProfileError(insertResult.error) ? null : insertResult.error
        }

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
        return NextResponse.redirect(new URL(next, redirectOrigin))

    }

    // return the user to an error page with instructions
    return NextResponse.redirect(new URL('/register/?error=missing_oauth_code', redirectOrigin))
}
