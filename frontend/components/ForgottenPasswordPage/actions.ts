"use server"

import {ForgotPasswordResult, forgotPasswordSchema, forgotPasswordSchemaType} from "./schema";
import {createClient} from "@/lib/supabase/server";
import {captureAppError} from "@/lib/sentry/captureAppError";

export default async function sendPasswordResetLink(userForgotPasswordData: forgotPasswordSchemaType): Promise<ForgotPasswordResult> {
    const parsed = forgotPasswordSchema.safeParse(userForgotPasswordData)
    if (!parsed.success) {
        return {
            ok: false,
            formError: "Please enter a valid email address."
        }
    }

    const supabase = await createClient();


    const {error} = await supabase.auth.resetPasswordForEmail(
        parsed.data.email,
        {redirectTo: `${process.env.NEXT_PUBLIC_URL_PREFIX}/reset-password`}
    )
    if (error) {
        console.error("Password reset email error:", error.message)
        captureAppError({
            message: "Error sending password reset link to user email",
            area: "send_password_link_action",
            endpoint: "supabase:reset_password_for_email",
            action: "send_reset_password_link",
            error,
        })

        return {
            ok: false,
            formError: "Something went wrong while sending the reset link. Please try again."
        }


    }
    return {
        ok: true
    }


}