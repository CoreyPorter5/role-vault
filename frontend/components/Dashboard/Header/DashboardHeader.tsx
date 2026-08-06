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
            className="z-10 flex w-full shrink-0 items-center justify-start gap-x-3 border-b border-b-black/10 bg-white px-3 py-3 sm:px-4 lg:gap-x-6 lg:px-5 lg:py-4">

            <button
                type="button"
                aria-label="Open navigation"
                onClick={onOpenSidebar}
                className="shrink-0 rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            >
                <Menu size={21}/>
            </button>

            <div className={"flex items-center justify-start flex-1 min-w-0 gap-x-4"}>
                <div
                    className="hidden min-w-0 flex-1 items-center justify-start gap-x-2 rounded-md bg-[#ededed] px-4 py-2 shadow-sm sm:flex">
                    <Search className={"opacity-25"} size={"20"}/>
                    <input className={"outline-none w-full font-semibold placeholder-black/25"}
                           placeholder={"Search applications, resumes, or companies..."}/>

                </div>
                <Link href={"/pricing"} className="hidden text-sm font-bold text-black/60 xl:block">Overview</Link>
                <Link href={"/resources"} className="hidden text-sm font-bold text-black/60 xl:block">Analytics</Link>
            </div>

            <div className="hidden h-7 shrink-0 border-l border-l-black/20 sm:block"/>

            <div className="flex shrink-0 items-center justify-start gap-x-3 sm:gap-x-4">
                <Bell className="hidden opacity-40 sm:block" size={20} fill={"black"}/>
                {profile && (profile.plan === "pro" || profile.plan === "trial") ?
                    <Link href={"/dashboard/billing"}
                          className={"bg-yellow-200/50 hover:cursor-pointer text-xs text-yellow-700 font-bold px-3 shadow-2xs rounded-full py-1"}>
                        Pro
                    </Link> :
                    <Link href={"/dashboard/upgrade"}
                          className={"bg-blue-200/50 hover:cursor-pointer text-xs text-blue-700 font-bold px-3 shadow-2xs rounded-full py-1"}>
                        Upgrade
                    </Link>

                }


                <Link href={"/dashboard/account"}
                      className={"h-8 w-8 rounded-full flex items-center justify-center font-semibold select-none hover:cursor-pointer text-black/80 bg-blue-200"}>
                    {userFirstNameInitial}
                </Link>

            </div>
        </header>
    )
}
