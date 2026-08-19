"use server"

import {loginSchemaType} from "./schema";
import {loginSchema} from "./schema";

import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {revalidatePath} from "next/cache";
import {isEmailNotConfirmedError} from "@/lib/auth/registration";
import {ensureUserProfile} from "@/lib/auth/profile";
import {captureAppError} from "@/lib/sentry/captureAppError";

type LoginResult =
    | { ok: true }
    | {
    ok: false;
    fieldErrors?: Partial<Record<keyof loginSchemaType, string>>;
    formError?: string;
};

export default async function loginUser(loginUserData: loginSchemaType): Promise<LoginResult>{

    const parsed = loginSchema.safeParse(loginUserData)
    if (!parsed.success) {
        return {
            ok: false,
            formError: "Please check your email and password and try again"
        }
    }

    const supabase = await createClient();
    const {data, error} = await supabase.auth.signInWithPassword(parsed.data)
    if (error) {
        if (isEmailNotConfirmedError(error)) {
            return {
                ok: false,
                formError: "Confirm your email before logging in. Check your inbox for the confirmation link."
            }
        }

        return {
            ok: false,
            fieldErrors: {email: "Incorrect email or password"}
        }
    }

    if (!data.session) {
        return {
            ok: false,
            formError: "We could not start your session. Please try again."
        }
    }

    const profileError = await ensureUserProfile(supabase, data.user)
    if (profileError) {
        captureAppError({
            code: "WEB_AUTH_PROFILE_PROVISION_FAILED",
            message: "Login succeeded but profile provisioning failed",
            error: new Error("Login profile provisioning failed"),
            area: "auth",
            action: "provision_email_profile_after_login",
            extra: {upstreamErrorCode: profileError.code},
        })
        return {
            ok: false,
            formError: "You are signed in, but we could not finish loading your account. Please try again."
        }
    }

    revalidatePath("/", "layout")
    redirect("/dashboard")
}
