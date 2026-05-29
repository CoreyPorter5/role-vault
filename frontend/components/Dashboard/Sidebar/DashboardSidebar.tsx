import {LogOutIcon} from "lucide-react";
import {createClient} from "@/lib/supabase/client";
import {usePathname, useRouter} from "next/navigation";
import Link from "next/link";
import {routes} from "./sidebarRoutes";

type DashboardSidebarProps = {
    sidebarOpen: boolean;
};

export default function DashboardSidebar({sidebarOpen}: DashboardSidebarProps) {
    const router = useRouter();
    const supabase = createClient();
    const pathname = usePathname();

    async function handleLogout() {
        const {error} = await supabase.auth.signOut();
        if (error) {
            console.error("Error signing out");
            return;
        }
        router.push("/");
    }

    return (
        <aside
            className={`${
                sidebarOpen ? "w-1/5 px-4 py-5" : "w-0 px-0 py-5"
            } relative h-full shrink-0 overflow-hidden border-r border-r-gray-200 bg-white transition-all duration-300 ease-in-out`}
        >
            <div
                className={`flex h-full flex-col transition-all duration-200 ${
                    sidebarOpen
                        ? "translate-x-0 opacity-100 delay-75"
                        : "-translate-x-2 pointer-events-none opacity-0"
                }`}
            >
                <div className="flex justify-center select-none">
                    <div className="text-3xl font-bold whitespace-nowrap tracking-tighter text-blue-700">
                        SeekSync
                    </div>
                </div>

                <div className="mt-10 flex-1">
                    <div
                        className="flex w-full flex-col gap-y-3 font-inter text-sm font-semibold uppercase text-black/50">
                        {routes.map((route) => (
                            <Link
                                key={route.path}
                                href={route.path}
                                className={`flex w-full items-center justify-start gap-x-3 rounded-md px-4 py-3 ${
                                    pathname === route.path
                                        ? "bg-blue-700/10 text-blue-700 border-r-5 border-r-blue-700"
                                        : "text-black/50"
                                }`}
                            >
                                <route.icon
                                    height={24} width={24}
                                    className={pathname === route.path ? "opacity-100" : "opacity-50"}
                                />
                                <p>{route.name}</p>
                            </Link>
                        ))}
                    </div>
                </div>

                <button
                    onClick={handleLogout}
                    className="flex items-center hover:cursor-pointer gap-x-3 self-start rounded-md px-4 py-3 font-inter text-sm font-semibold uppercase text-black/50"
                >
                    <LogOutIcon className="opacity-50"/>
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    );
}