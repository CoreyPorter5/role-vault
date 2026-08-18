"use client"

import Link from "next/link";
import {Bell, Menu, Search} from "lucide-react";
import {useJWKTokenAndUserAndSidebar} from "../Context/DashboardContextProvider";


export default function DashboardHeader({onOpenSidebar}: {onOpenSidebar: () => void}) {

    const {user, profile} = useJWKTokenAndUserAndSidebar()
    const userFirstNameInitial = profile?.first_name?.charAt(0).toUpperCase() ??
        user?.user_metadata?.first_name?.charAt(0).toUpperCase() ??
        user?.user_metadata?.given_name?.charAt(0).toUpperCase() ??
        user?.user_metadata?.name?.charAt(0).toUpperCase() ??
        user?.email?.charAt(0).toUpperCase() ??
        "U";


    return (
        <header
            className="z-10 flex h-16 w-full shrink-0 items-center justify-start gap-x-3 border-b border-[#dfddd6] bg-white px-3 sm:px-4 lg:gap-x-5 lg:px-6">

            <button
                type="button"
                aria-label="Open navigation"
                onClick={onOpenSidebar}
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-[#61666e] hover:bg-[#f5f4f0] hover:text-[#181d26] lg:hidden"
            >
                <Menu size={21}/>
            </button>

            <div className={"flex items-center justify-start flex-1 min-w-0 gap-x-4"}>
                <div
                    className="hidden min-w-0 max-w-2xl flex-1 items-center justify-start gap-x-2.5 rounded-lg border border-[#dfddd6] bg-[#f8f7f4] px-3.5 py-2 sm:flex">
                    <Search className="text-[#92969c]" size={18}/>
                    <input className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-[#999ca1]"
                           placeholder={"Search applications, resumes, or companies..."}/>

                </div>
            </div>

            <div className="hidden h-7 shrink-0 border-l border-[#e4e1da] sm:block"/>

            <div className="flex shrink-0 items-center justify-start gap-x-3 sm:gap-x-4">
                <button type="button" aria-label="Notifications" className="hidden size-10 items-center justify-center rounded-lg text-[#6e737b] hover:bg-[#f5f4f0] hover:text-[#181d26] sm:inline-flex">
                    <Bell size={18}/>
                </button>
                <Link href={"/dashboard/upgrade"}
                      className="rounded-md bg-[#e7effb] px-2.5 py-1 text-xs font-bold text-[#0D3880] hover:bg-[#dce8f8]">
                    Buy credits
                </Link>


                <Link href={"/dashboard/account"}
                      className="flex size-9 items-center justify-center rounded-lg bg-[#0D3880] text-sm font-bold text-white hover:bg-[#08285f]">
                    {userFirstNameInitial}
                </Link>

            </div>
        </header>
    )
}
