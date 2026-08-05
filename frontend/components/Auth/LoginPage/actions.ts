"use server"

import {loginSchemaType} from "./schema";
import {loginSchema} from "./schema";

import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";

type LoginResult =
    | { ok: true }
    | {
    ok: false;
    fieldErrors?: Partial<Record<keyof loginSchemaType, string>>;
    formError?: string;
};

export default async function loginUser(loginUserData: loginSchemaType): Promise<LoginResult>{

    const parsed = loginSchema.safeParse(loginUserData).success
    const supabase = await createClient();
    if(parsed){
        const {error} = await supabase.auth.signInWithPassword(
            loginUserData
        )
        if(error){
            if(error.message.toLowerCase().includes("invalid")){
                return {
                    ok: false,
                    fieldErrors: {email: "Incorrect email or password"}
                }
            }else{
                return {
                    ok: false,
                    fieldErrors: {email: "Incorrect email or password"}
                }
            }
        }

    }else if(!parsed){
        return {
            ok: false,
            formError: "Something went wrong while signing you up. Please try again"
        }
    }

    redirect("/dashboard")





}