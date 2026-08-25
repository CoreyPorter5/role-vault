import {LogOutIcon, PanelLeftClose, PanelLeftOpen, X} from "lucide-react";
import {createClient} from "@/lib/supabase/client";
import {resetAnalyticsIdentity} from "@/lib/analytics/client";
import {usePathname, useRouter} from "next/navigation";
import Link from "next/link";
import {routes} from "./sidebarRoutes";
import BrandMark from "../../BrandMark";

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
        resetAnalyticsIdentity();
        router.push("/");
    }

    return (
        <>
            {mobileOpen ? (
                <button
                    type="button"
                    aria-label="Close navigation"
                    onClick={onCloseMobile}
                    className="fixed inset-0 z-30 bg-slate-950/35 backdrop-blur-[1px] hover:bg-slate-950/40 xl:hidden"
                />
            ) : null}
            <aside
                aria-label="Dashboard navigation"
                className={`fixed inset-y-0 left-0 z-40 flex h-full w-72 shrink-0 flex-col overflow-hidden border-r border-[#dfddd6] bg-white px-4 py-4 shadow-xl transition-[transform,width] duration-300 ease-in-out xl:static xl:z-20 xl:translate-x-0 xl:shadow-none ${
                    mobileOpen ? "translate-x-0" : "-translate-x-full"
                } ${sidebarOpen ? "xl:w-64 xl:px-4" : "xl:w-20 xl:px-3"}`}
            >
                <div className={`flex min-h-10 items-center gap-2 ${
                    sidebarOpen ? "justify-between" : "xl:flex-col xl:justify-center xl:gap-1"
                }`}>
                    <div onClick={onCloseMobile}>
                        <span className={sidebarOpen ? "xl:block" : "xl:hidden"}><BrandMark href="/dashboard"/></span>
                        <span className={`hidden ${sidebarOpen ? "xl:hidden" : "xl:block"}`}><BrandMark href="/dashboard" compact/></span>
                    </div>
                    <button
                        type="button"
                        aria-label="Close navigation"
                        onClick={onCloseMobile}
                        className="inline-flex size-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 xl:hidden"
                    >
                        <X size={20}/>
                    </button>
                    <button
                        type="button"
                        aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                        title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                        onClick={onToggleDesktop}
                        className="hidden size-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-blue-700 xl:inline-flex"
                    >
                        {sidebarOpen ? <PanelLeftClose className={"hover:cursor-pointer"} size={19}/> : <PanelLeftOpen className={"hover:cursor-pointer"} size={19}/>}
                    </button>
                </div>

                <div className="mt-8 flex-1">
                    <div
                        className="flex w-full flex-col gap-y-1.5 font-inter text-sm font-semibold text-[#656a72]">
                        {routes.map((route) => (
                            <Link
                                key={route.path}
                                href={route.path}
                                onClick={onCloseMobile}
                                aria-current={pathname === route.path ? "page" : undefined}
                                aria-label={!sidebarOpen ? route.name : undefined}
                                title={!sidebarOpen ? route.name : undefined}
                                className={`flex w-full items-center gap-x-3 rounded-lg px-3 py-2.5 transition-colors ${
                                    sidebarOpen ? "xl:justify-start" : "xl:justify-center"
                                } ${
                                    pathname === route.path
                                        ? "bg-[#EFF6FF] text-[#2563EB]"
                                        : "hover:bg-[#f5f4f0] hover:text-[#181d26]"
                                }`}
                            >
                                <route.icon
                                    height={22} width={22}
                                    className={`shrink-0 ${pathname === route.path ? "opacity-100" : "opacity-70"}`}
                                />
                                <span className={`leading-5 ${sidebarOpen ? "xl:block" : "xl:hidden"}`}>{route.name}</span>
                            </Link>
                        ))}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleLogout}
                    aria-label={!sidebarOpen ? "Logout" : undefined}
                    title={!sidebarOpen ? "Logout" : undefined}
                    className={`flex w-full items-center gap-x-3 rounded-lg px-3 py-2.5 font-inter text-sm font-semibold text-[#656a72] transition-colors hover:bg-[#f5f4f0] hover:text-[#181d26] ${
                        sidebarOpen ? "xl:justify-start" : "xl:justify-center"
                    }`}
                >
                    <LogOutIcon className="shrink-0 opacity-50" size={22}/>
                    <span className={sidebarOpen ? "xl:block" : "xl:hidden"}>Logout</span>
                </button>
            </aside>
        </>
    );
}
