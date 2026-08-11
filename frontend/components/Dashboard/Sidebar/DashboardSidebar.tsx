import {LogOutIcon, PanelLeftClose, PanelLeftOpen, X} from "lucide-react";
import {createClient} from "@/lib/supabase/client";
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
                className={`fixed inset-y-0 left-0 z-40 flex h-full w-72 shrink-0 flex-col overflow-hidden border-r border-[#dfddd6] bg-white px-4 py-4 shadow-xl transition-[transform,width] duration-300 ease-in-out lg:static lg:z-20 lg:translate-x-0 lg:shadow-none ${
                    mobileOpen ? "translate-x-0" : "-translate-x-full"
                } ${sidebarOpen ? "lg:w-64 lg:px-4" : "lg:w-20 lg:px-3"}`}
            >
                <div className={`flex min-h-10 items-center gap-2 ${
                    sidebarOpen ? "justify-between" : "lg:flex-col lg:justify-center lg:gap-1"
                }`}>
                    <div onClick={onCloseMobile}>
                        <span className={sidebarOpen ? "lg:block" : "lg:hidden"}><BrandMark href="/dashboard"/></span>
                        <span className={`hidden ${sidebarOpen ? "lg:hidden" : "lg:block"}`}><BrandMark href="/dashboard" compact/></span>
                    </div>
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
                                    sidebarOpen ? "lg:justify-start" : "lg:justify-center"
                                } ${
                                    pathname === route.path
                                        ? "bg-[#e7effb] text-[#0D3880]"
                                        : "hover:bg-[#f5f4f0] hover:text-[#181d26]"
                                }`}
                            >
                                <route.icon
                                    height={22} width={22}
                                    className={`shrink-0 ${pathname === route.path ? "opacity-100" : "opacity-70"}`}
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
                    className={`flex w-full items-center gap-x-3 rounded-lg px-3 py-2.5 font-inter text-sm font-semibold text-[#656a72] transition-colors hover:bg-[#f5f4f0] hover:text-[#181d26] ${
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
