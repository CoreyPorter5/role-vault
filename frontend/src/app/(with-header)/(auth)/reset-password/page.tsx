"use client"

import {useRouter} from "next/navigation";
import {useEffect, useState} from "react";
import {createClient} from "@/lib/supabase/client";
import ResetPasswordComponent from "../../../../../components/ResetPasswordPage/ResetPasswordComponent";

export default function ResetPasswordPage() {

    const supabase = createClient();
    const router = useRouter();
    const [checkingSession, setCheckingSession] = useState<boolean>(true);
    const [allowed, setAllowed] = useState<boolean>(false);

    useEffect(() => {
        const checkSession = async () => {
            const {data} = await supabase.auth.getSession();
            if (!data.session) {
                setCheckingSession(false)
                router.replace("/forgot-password")
                return
            }
            setAllowed(true)
            setCheckingSession(false)
        }
        checkSession()
    }, [router, supabase.auth]);

    if (checkingSession) {
        return <div>Checking reset link...</div>
    }

    if (!allowed) {
        return null
    }

    return (
        <main className={"flex items-center justify-center"}>
            <ResetPasswordComponent/>
        </main>

    )
}