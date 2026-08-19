"use client"

import Link from "next/link";
import {usePathname, useRouter} from "next/navigation";
import {useUser} from "../Context/HomepageContextProvider";
import {createClient} from "@/lib/supabase/client";
import {useEffect} from "react";
import BrandMark from "../BrandMark";

export default function Header() {

    const url = usePathname()
    const {user, setUser} = useUser();
    const router = useRouter()

    useEffect(() => {
        const fetchUser = async () => {
            const supabase = createClient()
            const {data, error} = await supabase.auth.getUser()
            if (error || !data.user) {
                setUser(null)
                return
            }
            setUser(data.user)
        }

        fetchUser()

    }, [setUser]);


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
        <header
            className="sticky top-0 z-40 border-b border-[#dedede] bg-white">
            <div className="marketing-container flex h-[72px] items-center justify-between gap-5">
                <div className="flex shrink-0 items-center gap-10">
                    <BrandMark/>

                    <nav aria-label="Primary navigation" className="hidden items-center gap-8 md:flex">
                        <Link href="/#features"
                              className="text-[15px] font-medium text-[#3f4651] hover:text-[#0D3880]">Features</Link>
                        <Link href="/#workflow"
                              className="text-[15px] font-medium text-[#3f4651] hover:text-[#0D3880]">How it works</Link>
                    </nav>
                </div>

                {user ?
                    <div className="flex items-center justify-end gap-1.5 sm:gap-2.5">
                        <Link href="/pricing"
                              className={`hidden min-h-9 items-center justify-center rounded-lg border px-4 text-[15px] font-medium transition sm:inline-flex ${url === "/pricing" ? "border-[#0D3880] bg-[#eaf1fb] text-[#0D3880]" : "border-[#cfcfcf] bg-white text-[#242933] hover:border-[#9ea3ab] hover:bg-[#fafafa]"}`}>
                            Pricing
                        </Link>
                        <Link href="/dashboard"
                              className="inline-flex min-h-9 items-center justify-center rounded-lg bg-[#0D3880] px-4 text-[15px] font-semibold text-white shadow-[0_2px_5px_rgba(13,56,128,0.18)] hover:bg-[#08285f] sm:px-5">
                            Open dashboard
                        </Link>
                        <button type="button" onClick={logoutUser}
                                className="hidden min-h-9 rounded-lg px-3 text-[15px] font-medium text-[#3f4651] hover:bg-[#f5f4f0] hover:text-[#181d26] lg:block">
                            Log out
                        </button>
                    </div>

                    :
                    <div className="flex items-center justify-end gap-1.5 sm:gap-2.5">
                        <Link href="/pricing"
                              className={`hidden min-h-9 items-center justify-center rounded-lg border px-4 text-[15px] font-medium transition md:inline-flex ${url === "/pricing" ? "border-[#0D3880] bg-[#eaf1fb] text-[#0D3880]" : "border-[#cfcfcf] bg-white text-[#242933] hover:border-[#9ea3ab] hover:bg-[#fafafa]"}`}>
                            See pricing
                        </Link>
                        <Link href="/register"
                              className="inline-flex min-h-9 items-center justify-center rounded-lg bg-[#0D3880] px-3 text-[15px] font-semibold text-white shadow-[0_2px_5px_rgba(13,56,128,0.18)] hover:bg-[#08285f] sm:px-5">
                            Get started
                        </Link>
                        <Link href="/login"
                              className="inline-flex min-h-9 items-center px-1.5 text-[15px] font-medium text-[#3f4651] hover:text-[#181d26] sm:px-2">
                            Log in
                        </Link>
                    </div>
                }
            </div>
        </header>
    )
}
