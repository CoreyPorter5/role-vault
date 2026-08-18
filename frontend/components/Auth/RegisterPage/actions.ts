"use server"

import {RegisterResult, registerSchema, registerSchemaType} from "./schema";
import {createClient} from "@/lib/supabase/server";
import {redirect} from "next/navigation";
import {captureAppError} from "@/lib/sentry/captureAppError";

export default async function registerUser(userRegisterData: registerSchemaType): Promise<RegisterResult> {
    const parsed = registerSchema.safeParse(userRegisterData)
    if (!parsed.success) {
        return {
            ok: false,
            formError: "Please check your account details and try again"
        }
    }

    const supabase = await createClient();
    if (parsed.success) {
        const {data, error} = await supabase.auth.signUp({
            email: parsed.data.email,
            password: parsed.data.password,
            options: {
                data: {
                    first_name: parsed.data.firstName,
                    last_name: parsed.data.lastName,
                },
            },
        })
        if (error) {
            if (error.message.toLowerCase().includes("already")) {
                return {
                    ok: false,
                    fieldErrors: {email: "Email is already registered"}
                }
            }

            return {
                ok: false,
                formError: "Something went wrong while signing you up. Please try again"
            }


        }
        if (!data || !data.user) {
            return {
                ok: false,
                formError: "No user data returned from auth provider."
            }
        }


        // Billing periods and limits use trusted database defaults. Browser
        // sessions may only provide identity/profile fields.
        const {error: profileError} = await supabase.from("profiles").insert({
            user_id: data.user.id,
            email: parsed.data.email,
            first_name: parsed.data.firstName,
            last_name: parsed.data.lastName,
        })

        if (profileError) {
            captureAppError({
                code: "WEB_AUTH_PROFILE_PROVISION_FAILED",
                message: "Authentication succeeded but profile provisioning failed",
                error: new Error("Profile provisioning failed"),
                area: "auth",
                action: "provision_email_profile",
                extra: {upstreamErrorCode: profileError.code},
            });
            return {
                ok: false,
                formError: "Your account was successfully created but we could not create your profile. Please try again or contact support"
            }
        }
    }

    redirect("/dashboard")

}
