import {Briefcase, CircleUserRound, FileText, LayoutDashboard, LogOutIcon} from "lucide-react";
import {createClient} from "@/lib/supabase/client";
import {useRouter} from "next/navigation";


type DashboardSidebarProps = {
    sidebarOpen: boolean
}


export default function DashboardSidebar({sidebarOpen}: DashboardSidebarProps) {
    const router = useRouter();
    const supabase = createClient();

    async function handleLogout(){
        const {error} = await supabase.auth.signOut();
        if(error){
            console.error("Error signing out")
            return
        }
        router.push("/")
    }



    return (
        <aside
            className={`${sidebarOpen ? "w-1/5 py-5 px-2" : "w-0 px-0 py-5"} ease-in-out h-full gap-y-10 transform duration-300 relative border-r border-r-gray-200 items-center overflow-hidden relative bg-white text-white shrink-0 flex flex-col`}>
            <div className={`flex h-full flex-col gap-y-10 transition-all duration-200 ${sidebarOpen ? "opacity-100 translate-x-0 delay-75" : "opacity-0 -translate-x-2 pointer-events-none"}`}>
                <div className={"text-3xl font-bold whitespace-nowrap text-blue-700"}>SeekSync</div>

                <div className={"flex items-center justify-center"}>
                    <div
                        className={"flex w-full font-inter flex-col text-sm text-black/50 font-semibold uppercase items-start justify-center gap-y-7"}>
                        <div className={"flex items-center justify-center gap-x-2"}>
                            <LayoutDashboard color={"black"} className={" opacity-50"}/>
                            <p>Dashboard</p>
                        </div>
                        <div className={"flex items-center justify-center gap-x-2"}>
                            <Briefcase color={"black"} className={"opacity-50"}/>
                            <p>My Jobs</p>
                        </div>
                        <div className={"flex items-center justify-center gap-x-2"}>
                            <FileText color={"black"} className={"opacity-50"}/>
                            <p>Resume Settings</p>
                        </div>
                        <div className={"flex items-center justify-center gap-x-2"}>
                            <CircleUserRound color={"black"} className={"opacity-50"}/>
                            <p>Account</p>
                        </div>

                    </div>


                </div>
                <div className={"flex absolute bottom-1/1000 self-start items-center justify-center gap-x-3 hover:cursor-pointer"}>
                    <LogOutIcon className={"invert opacity-50"}/>
                    <div onClick={() => handleLogout()} className={"font-inter uppercase text-black/50 text-sm font-semibold"}>Logout</div>
                </div>

            </div>







        </aside>
    )


}