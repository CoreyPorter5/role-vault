"use client"

import Link from "next/link";
import {usePathname, useRouter} from "next/navigation";
import {useUser} from "../Context/HomepageContextProvider";
import {createClient} from "@/lib/supabase/client";
import {useEffect, useState} from "react";
import BrandMark from "../BrandMark";

export default function Header() {

    const url = usePathname()
    const {user, setUser} = useUser();
    const router = useRouter()
    const [isCompact, setIsCompact] = useState(false)

    useEffect(() => {
        const supabase = createClient()
        // This session only controls presentation in the public header. Protected
        // routes still verify the user on the server before rendering dashboard data.
        const {data: {subscription}} = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
        })

        return () => subscription.unsubscribe()
    }, [setUser]);

    useEffect(() => {
        const updateHeader = () => setIsCompact(window.scrollY > 48)

        updateHeader()
        window.addEventListener("scroll", updateHeader, {passive: true})
        return () => window.removeEventListener("scroll", updateHeader)
    }, [])


    const logoutUser = async () => {
        const supabase = createClient();
        const {error} = await supabase.auth.signOut();
        if (error) {
            console.error("Error logging out" + error.message);
            return;
        }
        setUser(null);
        router.push("/")
        router.refresh();
    }


    return (
        <header className={`${url === "/" ? "fixed inset-x-0 bg-transparent" : "sticky bg-white"} top-0 z-40 py-3 sm:py-4`}>
            <div className={`marketing-glass-header ${isCompact ? "marketing-glass-header-compact" : ""} flex h-16 items-center justify-between gap-4 px-3.5 sm:px-4.5`}>
                <div className="flex min-w-0 shrink-0 items-center gap-7 lg:gap-9">
                    <BrandMark/>

                    <nav aria-label="Primary navigation" className="hidden items-center gap-0.5 md:flex">
                        <Link href="/#features"
                              className="marketing-nav-link">Product</Link>
                        <Link href="/#workflow"
                              className="marketing-nav-link">Workflow</Link>
                        <Link href="/pricing"
                              aria-current={url === "/pricing" ? "page" : undefined}
                              className={`marketing-nav-link ${url === "/pricing" ? "marketing-nav-link-active" : ""}`}>Pricing</Link>
                    </nav>
                </div>

                {user ?
                    <div className="flex items-center justify-end gap-1.5 sm:gap-2.5">
                        <Link href="/dashboard"
                              className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#2563EB] px-4 text-[15px] font-semibold text-white shadow-[0_5px_16px_rgba(37,99,235,0.22)] hover:bg-[#1D4ED8] hover:shadow-[0_7px_20px_rgba(37,99,235,0.27)] sm:px-5">
                            Open dashboard
                        </Link>
                        <button type="button" onClick={logoutUser}
                                className="hidden min-h-10 rounded-full px-3 text-[15px] font-medium text-[#3f4651] hover:bg-white/65 hover:text-[#181d26] lg:block">
                            Log out
                        </button>
                    </div>

                    :
                    <div className="flex items-center justify-end gap-1.5 sm:gap-2.5">
                        <Link href="/login"
                              className="inline-flex min-h-10 items-center rounded-full px-2.5 text-[15px] font-semibold text-[#3f4651] hover:bg-white/65 hover:text-[#181d26] max-[359px]:hidden sm:px-3">
                            Log in
                        </Link>
                        <Link href="/register"
                              className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#2563EB] px-3.5 text-[15px] font-semibold text-white shadow-[0_5px_16px_rgba(37,99,235,0.22)] hover:bg-[#1D4ED8] hover:shadow-[0_7px_20px_rgba(37,99,235,0.27)] sm:px-5">
                            Get started
                        </Link>
                    </div>
                }
            </div>
        </header>
    )
}
