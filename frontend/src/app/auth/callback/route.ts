import {NextResponse} from 'next/server'
import {createClient} from "@/lib/supabase/server";
import {captureAppError} from "@/lib/sentry/captureAppError";

// The client you created from the Server-Side Auth instructions


export async function GET(request: Request) {
    const {searchParams, origin} = new URL(request.url)
    const code = searchParams.get('code')
    // if "next" is in param, use it as the redirect URL
    let next = searchParams.get('next') ?? '/'
    if (!next.startsWith('/')) {
        // if "next" is not a relative URL, use the default
        next = '/'
    }

    if (code) {
        const supabase = await createClient()
        const {data, error} = await supabase.auth.exchangeCodeForSession(code)
        if (error || !data.user) {
            return NextResponse.redirect(`${origin}/register/?error=google_sign_in_failed`)
        }

        const user = data.user
        const userName = user.user_metadata.name.split(" ")
        const userFirstName: string = userName[0]
        const userLastName: string = userName[1]
        // Billing periods and limits use trusted database defaults. Browser
        // sessions may only provide identity/profile fields.
        const {error: profileError} = await supabase.from("profiles").upsert({
            user_id: user.id,
            email: user.email ?? "",
            first_name: userFirstName,
            last_name: userLastName,
        },
            {
                onConflict: "user_id",
                ignoreDuplicates: true,
            })

        if (profileError) {
            captureAppError({
                code: "WEB_AUTH_PROFILE_PROVISION_FAILED",
                message: "OAuth succeeded but profile provisioning failed",
                error: new Error("OAuth profile provisioning failed"),
                area: "auth",
                action: "provision_oauth_profile",
                extra: {upstreamErrorCode: profileError.code},
            });
            return NextResponse.redirect(`${origin}/register?error=profile_creation_failed`)
        }



        const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
        const isLocalEnv = process.env.NODE_ENV === 'development'
        if (isLocalEnv) {
            // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
            return NextResponse.redirect(`${origin}${next}`)
        } else if (forwardedHost) {
            return NextResponse.redirect(`https://${forwardedHost}${next}`)
        } else {
            return NextResponse.redirect(`${origin}${next}`)
        }

    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/register/?error=missing_oauth_code`)
}
