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
            className="sticky top-0 z-40 border-b border-[#e4e1da] bg-white/88 backdrop-blur-xl supports-[backdrop-filter]:bg-white/80">
            <div className="marketing-container flex h-[76px] items-center justify-between gap-5">
                <div className="flex shrink-0 items-center gap-8 lg:gap-10">
                    <BrandMark/>

                    <nav aria-label="Primary navigation" className="hidden items-center gap-1 rounded-xl border border-[#e4e1da] bg-[#f7f6f2] p-1 md:flex">
                        <Link href="/#features"
                              className="inline-flex min-h-8 items-center rounded-lg px-3 text-sm font-semibold text-[#4d535c] hover:bg-white hover:text-[#0D3880] hover:shadow-[0_1px_3px_rgba(24,29,38,0.08)]">Product</Link>
                        <Link href="/#workflow"
                              className="inline-flex min-h-8 items-center rounded-lg px-3 text-sm font-semibold text-[#4d535c] hover:bg-white hover:text-[#0D3880] hover:shadow-[0_1px_3px_rgba(24,29,38,0.08)]">How it works</Link>
                        <Link href="/pricing"
                              className={`inline-flex min-h-8 items-center rounded-lg px-3 text-sm font-semibold ${url === "/pricing" ? "bg-white text-[#0D3880] shadow-[0_1px_3px_rgba(24,29,38,0.08)]" : "text-[#4d535c] hover:bg-white hover:text-[#0D3880] hover:shadow-[0_1px_3px_rgba(24,29,38,0.08)]"}`}>Pricing</Link>
                    </nav>
                </div>

                {user ?
                    <div className="flex items-center justify-end gap-1.5 sm:gap-2.5">
                        <Link href="/dashboard"
                              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#0D3880] px-4 text-[15px] font-semibold text-white shadow-[0_4px_12px_rgba(13,56,128,0.18)] hover:bg-[#08285f] sm:px-5">
                            Open dashboard
                        </Link>
                        <button type="button" onClick={logoutUser}
                                className="hidden min-h-10 rounded-lg px-3 text-[15px] font-medium text-[#3f4651] hover:bg-[#f5f4f0] hover:text-[#181d26] lg:block">
                            Log out
                        </button>
                    </div>

                    :
                    <div className="flex items-center justify-end gap-1.5 sm:gap-2.5">
                        <Link href="/login"
                              className="inline-flex min-h-10 items-center rounded-lg px-2.5 text-[15px] font-medium text-[#3f4651] hover:bg-[#f5f4f0] hover:text-[#181d26] max-[359px]:hidden sm:px-3">
                            Log in
                        </Link>
                        <Link href="/register"
                              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#0D3880] px-3.5 text-[15px] font-semibold text-white shadow-[0_4px_12px_rgba(13,56,128,0.18)] hover:bg-[#08285f] sm:px-5">
                            Get started
                        </Link>
                    </div>
                }
            </div>
        </header>
    )
}
