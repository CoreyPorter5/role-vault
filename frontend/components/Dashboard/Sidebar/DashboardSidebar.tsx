import {LogOutIcon, PanelLeftClose, PanelLeftOpen, X} from "lucide-react";
import {createClient} from "@/lib/supabase/client";
import {usePathname, useRouter} from "next/navigation";
import Link from "next/link";
import {routes} from "./sidebarRoutes";

type DashboardSidebarProps = {
    sidebarOpen: boolean;
    mobileOpen: boolean;
    onCloseMobile: () => void;
    onToggleDesktop: () => void;
};

export default function DashboardSidebar({sidebarOpen, mobileOpen, onCloseMobile, onToggleDesktop}: DashboardSidebarProps) {
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
        <>
            {mobileOpen ? (
                <button
                    type="button"
                    aria-label="Close navigation"
                    onClick={onCloseMobile}
                    className="fixed inset-0 z-30 bg-slate-950/35 backdrop-blur-[1px] lg:hidden"
                />
            ) : null}
            <aside
                aria-label="Dashboard navigation"
                className={`fixed inset-y-0 left-0 z-40 flex h-full w-72 shrink-0 flex-col overflow-hidden border-r border-gray-200 bg-white px-4 py-5 shadow-xl transition-[transform,width] duration-300 ease-in-out lg:static lg:z-20 lg:translate-x-0 lg:shadow-none ${
                    mobileOpen ? "translate-x-0" : "-translate-x-full"
                } ${sidebarOpen ? "lg:w-64 lg:px-4" : "lg:w-20 lg:px-3"}`}
            >
                <div className={`flex min-h-10 items-center gap-2 ${
                    sidebarOpen ? "justify-between" : "lg:flex-col lg:justify-center lg:gap-1"
                }`}>
                    <Link href="/dashboard" onClick={onCloseMobile} className="min-w-0 select-none text-blue-700">
                        <span className={`whitespace-nowrap text-3xl font-bold tracking-tighter ${sidebarOpen ? "lg:block" : "lg:hidden"}`}>
                            SeekSync
                        </span>
                        <span className={`hidden text-3xl font-bold tracking-tighter ${sidebarOpen ? "lg:hidden" : "lg:block"}`}>
                            S
                        </span>
                    </Link>
                    <button
                        type="button"
                        aria-label="Close navigation"
                        onClick={onCloseMobile}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
                    >
                        <X size={20}/>
                    </button>
                    <button
                        type="button"
                        aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                        title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                        onClick={onToggleDesktop}
                        className="hidden rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-blue-700 lg:inline-flex"
                    >
                        {sidebarOpen ? <PanelLeftClose size={19}/> : <PanelLeftOpen size={19}/>}
                    </button>
                </div>

                <div className="mt-9 flex-1">
                    <div
                        className="flex w-full flex-col gap-y-2 font-inter text-sm font-semibold uppercase text-black/50">
                        {routes.map((route) => (
                            <Link
                                key={route.path}
                                href={route.path}
                                onClick={onCloseMobile}
                                aria-current={pathname === route.path ? "page" : undefined}
                                aria-label={!sidebarOpen ? route.name : undefined}
                                title={!sidebarOpen ? route.name : undefined}
                                className={`flex w-full items-center gap-x-3 rounded-lg px-3 py-3 transition-colors ${
                                    sidebarOpen ? "lg:justify-start" : "lg:justify-center"
                                } ${
                                    pathname === route.path
                                        ? "bg-blue-700/10 text-blue-700"
                                        : "text-black/50 hover:bg-slate-100 hover:text-slate-800"
                                }`}
                            >
                                <route.icon
                                    height={22} width={22}
                                    className={`shrink-0 ${pathname === route.path ? "opacity-100" : "opacity-50"}`}
                                />
                                <span className={`leading-5 ${sidebarOpen ? "lg:block" : "lg:hidden"}`}>{route.name}</span>
                            </Link>
                        ))}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleLogout}
                    aria-label={!sidebarOpen ? "Logout" : undefined}
                    title={!sidebarOpen ? "Logout" : undefined}
                    className={`flex w-full items-center gap-x-3 rounded-lg px-3 py-3 font-inter text-sm font-semibold uppercase text-black/50 transition-colors hover:bg-slate-100 hover:text-slate-800 ${
                        sidebarOpen ? "lg:justify-start" : "lg:justify-center"
                    }`}
                >
                    <LogOutIcon className="shrink-0 opacity-50" size={22}/>
                    <span className={sidebarOpen ? "lg:block" : "lg:hidden"}>Logout</span>
                </button>
            </aside>
        </>
    );
}
