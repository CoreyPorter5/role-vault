"use client"

import Image from "next/image";
import Link from "next/link";
import {Bell, Menu, Search} from "lucide-react";
import {useState} from "react";
import {useJWKTokenAndUserAndSidebar} from "../Context/DashboardContextProvider";
import {getGoogleAvatarUrl} from "@/lib/auth/google-avatar";

function DashboardUserAvatar({avatarUrl, initial}: {avatarUrl: string | null; initial: string}) {
    const [imageFailed, setImageFailed] = useState(false);

    if (!avatarUrl || imageFailed) return <>{initial}</>;

    return (
        <Image
            src={avatarUrl}
            alt=""
            width={36}
            height={36}
            sizes="36px"
            className="size-full object-cover"
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
        />
    );
}


export default function DashboardHeader({onOpenSidebar}: {onOpenSidebar: () => void}) {

    const {user, profile} = useJWKTokenAndUserAndSidebar()
    const userFirstNameInitial = profile?.first_name?.charAt(0).toUpperCase() ??
        user?.user_metadata?.first_name?.charAt(0).toUpperCase() ??
        user?.user_metadata?.given_name?.charAt(0).toUpperCase() ??
        user?.user_metadata?.name?.charAt(0).toUpperCase() ??
        user?.email?.charAt(0).toUpperCase() ??
        "U";
    const googleAvatarUrl = getGoogleAvatarUrl(user);


    return (
        <header
            className="z-10 flex h-16 w-full shrink-0 items-center justify-start gap-x-3 border-b border-[#dfddd6] bg-white px-3 sm:px-4 xl:gap-x-5 xl:px-6">

            <button
                type="button"
                aria-label="Open navigation"
                onClick={onOpenSidebar}
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-[#61666e] hover:bg-[#f5f4f0] hover:text-[#181d26] xl:hidden"
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
                      className="rounded-md bg-[#EFF6FF] px-2.5 py-1 text-xs font-bold text-[#2563EB] hover:bg-[#DBEAFE]">
                    Buy credits
                </Link>


                <Link href={"/dashboard/account"}
                      aria-label="Open account settings"
                      className={`flex size-9 items-center justify-center overflow-hidden bg-[#2563EB] text-sm font-bold text-white ring-1 ring-transparent hover:bg-[#1D4ED8] hover:ring-[#bfd2f5] ${googleAvatarUrl ? "rounded-full" : "rounded-lg"}`}>
                    <DashboardUserAvatar
                        key={googleAvatarUrl ?? "initial"}
                        avatarUrl={googleAvatarUrl}
                        initial={userFirstNameInitial}
                    />
                </Link>

            </div>
        </header>
    )
}
