"use client"

import Link from "next/link";
import {Bell, Search} from "lucide-react";
import {useJWKTokenAndUserAndSidebar} from "../Context/DashboardContextProvider";


export default function DashboardHeader(){

    const {user} = useJWKTokenAndUserAndSidebar()
    const userFirstNameInitial = user?.user_metadata.first_name.split("")[0]




    return(
        <header className={"flex w-full items-center gap-x-8 justify-start border-b border-b-black/10 bg-white px-5 py-4 shrink-0 z-10"}>

            <div className={"flex items-center justify-start flex-1 min-w-0 gap-x-4"}>
                <div className={"flex min-w-0 flex-1 max-w-full items-center gap-x-2 bg-[#ededed] rounded-md shadow-sm px-5 py-2 justify-start"}>
                    <Search className={"opacity-25"} size={"20"}/>
                    <input className={"outline-none w-full font-semibold placeholder-black/25"} placeholder={"Search applications, resumes, or companies..."}/>

                </div>
                <Link href={"/pricing"} className={`text-black/60 font-bold text-sm`}>Overview</Link>
                <Link href={"/resources"} className={`text-black/60 font-bold text-sm`}>Analytics</Link>
            </div>

            <div className={"shrink-0 border-l h-2/3 border-l-black/20"}/>

            <div className={"flex items-center justify-start gap-x-5"}>
                <Bell className={"opacity-40"} size={20} fill={"black"}/>
                <Link href={"/pricing"} className={"bg-blue-200/50 hover:cursor-pointer text-xs text-blue-700 font-bold px-3 shadow-2xs rounded-full py-1"}>
                    Upgrade
                </Link>
                <Link href={"/dashboard/account"} className={"h-8 w-8 rounded-full flex items-center justify-center font-semibold select-none hover:cursor-pointer text-black/80 bg-blue-200"}>
                    {userFirstNameInitial}
                </Link>

            </div>
        </header>
    )
}