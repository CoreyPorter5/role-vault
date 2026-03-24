"use server"

import {createClient} from "@/lib/supabase/server";

export default async function handleLogout(){
    const supabase = await createClient();
    const {error} = await supabase.auth.signOut()
    if(!error){
        console.log("Logged out success!")
    }

}