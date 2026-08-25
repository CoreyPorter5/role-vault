"use server"

import {RegisterResult} from "./RegisterPage/schema";
import {createClient} from "@/lib/supabase/server";
import {redirect} from "next/navigation";

export async function loginUserWithGoogle(intent: "login" | "register" = "login"): Promise<RegisterResult>{
    const supabase = await createClient();
    const siteURL = process.env.NEXT_PUBLIC_URL_PREFIX
    const {data, error} = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
            redirectTo: `${siteURL}/auth/callback?next=/dashboard&intent=${intent}`
        }
    })

    if(error){
        return {
            ok: false,
            formError: "Could not start google sign in. Please try again later"
        }
    }


    if (!data.url){
        return {
            ok: false,
            formError: "Google did not return a sign-in URL"
        }

    }


    redirect(data.url)

}
