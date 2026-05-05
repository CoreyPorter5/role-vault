"use client"

import Link from "next/link";
import {usePathname, useRouter} from "next/navigation";
import {useUser} from "../Context/HomepageContextProvider";
import {createClient} from "@/lib/supabase/client";

export default function Header(){

    const url = usePathname()
    const { user, setUser } = useUser();
    const router = useRouter()


    const logoutUser = async () => {
        const supabase = createClient();
        const {error} = await supabase.auth.signOut();
        if(error){
            console.error("Error logging out" + error.message);
            return;
        }
        setUser(null);
        router.push("/")
        router.refresh();
    }


    return(
        <header className={"w-screen grid grid-cols-3 items-center justify-between border-b border-b-black/10 bg-white py-4 px-4"}>
            <div className={"text-blue-700 select-none text-lg font-bold"}>
                <Link href={"/"}>SeekSync</Link>
            </div>

            <div className={"flex items-center justify-center gap-x-4"}>
                <Link href={"/"} className={`text-black/60 font-bold ${url === "/" && "text-blue-500 underline underline-offset-8"}`}>Features</Link>
                <Link href={"/pricing"} className={`text-black/60 font-bold ${url === "/pricing" && "text-blue-500 underline underline-offset-8"}`}>Pricing</Link>
                <Link href={"/resources"} className={`text-black/60 font-bold ${url === "/resources" && "text-blue-500 underline underline-offset-8"}`}>Resources</Link>

            </div>
            {user ?
                <div className={"flex items-center justify-end gap-x-4"}>
                    <Link href={"/dashboard"} className={"bg-blue-700 text-sm hover:cursor-pointer text-white font-bold px-3 shadow-md rounded-md py-1"}>
                        Dashboard
                    </Link>
                    <div onClick={logoutUser} className={"text-black/50 text-sm hover:cursor-pointer font-bold"}>
                        Logout
                    </div>
                </div>

                :
                <div className={"flex items-center justify-end gap-x-4"}>
                    <Link href={"/login"} className={"text-black/50 text-sm font-bold"}>
                        Sign In
                    </Link>
                    <Link href={"/register"} className={"bg-blue-700 text-sm text-white font-bold px-3 shadow-md rounded-md py-1"}>
                        Get Started
                    </Link>

                </div>

            }


        </header>
    )
}