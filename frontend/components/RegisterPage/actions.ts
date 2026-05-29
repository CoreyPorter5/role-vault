"use server"

import {RegisterResult, registerSchema, registerSchemaType} from "./schema";
import {createClient} from "@/lib/supabase/server";
import {redirect} from "next/navigation";

export default async function registerUser(userRegisterData: registerSchemaType): Promise<RegisterResult> {
    const parsed = registerSchema.safeParse(userRegisterData)
    const supabase = await createClient();
    if (parsed.success) {
        const {data, error} = await supabase.auth.signUp({
            email: userRegisterData.email,
            password: userRegisterData.password,
            options: {
                data: {
                    first_name: userRegisterData.firstName,
                    last_name: userRegisterData.lastName,
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


        const now = new Date()
        const oneMonthFromNow = new Date(now)
        oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1)
        //Update profiles table
        const {error: profileError} = await supabase.from("profiles").insert({
            user_id: data.user.id,
            email: parsed.data.email,
            first_name: parsed.data.firstName,
            last_name: parsed.data.lastName,
            resume_usage_period_start: now.toISOString(),
            resume_usage_period_ends: oneMonthFromNow.toISOString(),
        })

        if (profileError) {
            console.error("Failed to create profile: ", profileError)
            return {
                ok: false,
                formError: "Your account was successfully created but we could not create your profile. Please try again or contact support"
            }
        }


    } else if (!parsed) {
        return {
            ok: false,
            formError: "Something went wrong while signing you up. Please try again"
        }
    }

    redirect("/dashboard")

}