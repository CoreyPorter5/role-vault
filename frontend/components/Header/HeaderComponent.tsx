"use client"

import Link from "next/link";
import {usePathname, useRouter} from "next/navigation";
import {useUser} from "../Context/HomepageContextProvider";
import {createClient} from "@/lib/supabase/client";
import {useEffect} from "react";

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
            className="flex w-full items-center justify-between gap-3 border-b border-b-black/10 bg-white px-3 py-4 sm:px-4">
            <div className={"text-blue-700 select-none text-lg font-bold"}>
                <Link className={"tracking-tighter"} href={"/"}>SeekSync</Link>
            </div>

            <nav className="hidden items-center justify-center gap-x-4 md:flex">
                <Link href={"/"}
                      className={`text-black/60 font-bold ${url === "/" && "text-blue-500 underline underline-offset-8"}`}>Features</Link>
                <Link href={"/pricing"}
                      className={`text-black/60 font-bold ${url === "/pricing" && "text-blue-500 underline underline-offset-8"}`}>Pricing</Link>
                <Link href={"/resources"}
                      className={`text-black/60 font-bold ${url === "/resources" && "text-blue-500 underline underline-offset-8"}`}>Resources</Link>

            </nav>
            {user ?
                <div className="flex items-center justify-end gap-x-2 sm:gap-x-4">
                    <Link href={"/dashboard"}
                          className={"bg-blue-700 text-sm hover:cursor-pointer text-white font-bold px-3 shadow-md rounded-md py-1"}>
                        Dashboard
                    </Link>
                    <button type="button" onClick={logoutUser} className="text-sm font-bold text-black/50 hover:cursor-pointer">
                        Logout
                    </button>
                </div>

                :
                <div className="flex items-center justify-end gap-x-2 sm:gap-x-4">
                    <Link href={"/login"} className={"text-black/50 text-sm font-bold"}>
                        Sign In
                    </Link>
                    <Link href={"/register"}
                          className="rounded-md bg-blue-700 px-2.5 py-1 text-xs font-bold text-white shadow-md sm:px-3 sm:text-sm">
                        Get Started
                    </Link>

                </div>

            }


        </header>
    )
}
