"use server"

import {RegisterResult, registerSchema, registerSchemaType} from "./schema";
import {createClient} from "@/lib/supabase/server";
import {redirect} from "next/navigation";

export default async function registerUser(userRegisterData: registerSchemaType): Promise<RegisterResult> {
    const parsed = registerSchema.safeParse(userRegisterData).success
    const supabase = await createClient();
    if (parsed) {
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


    } else if (!parsed) {
        return {
            ok: false,
            formError: "Something went wrong while signing you up. Please try again"
        }
    }


    redirect("/")


}