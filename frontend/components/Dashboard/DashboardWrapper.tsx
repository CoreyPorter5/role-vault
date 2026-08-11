"use client"

import DashboardHeader from "./Header/DashboardHeader";
import DashboardSidebar from "./Sidebar/DashboardSidebar";
import React, {useState} from "react";
import {useJWKTokenAndUserAndSidebar} from "./Context/DashboardContextProvider";


type DashboardWrapperProps = {
    children: React.ReactNode;
}



export default function DashboardWrapper({children}: DashboardWrapperProps) {
    const {sidebarOpen: isOpen, setSidebarOpen: setIsOpen} = useJWKTokenAndUserAndSidebar()
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    return (
        <div className="relative flex h-screen w-full overflow-hidden bg-[#f5f4f0]">
            <DashboardSidebar
                sidebarOpen={isOpen}
                mobileOpen={mobileSidebarOpen}
                onCloseMobile={() => setMobileSidebarOpen(false)}
                onToggleDesktop={() => setIsOpen((open) => !open)}
            />
            <div className="flex min-w-0 flex-1 flex-col">
                <DashboardHeader onOpenSidebar={() => setMobileSidebarOpen(true)}/>
                <main className="dashboard-canvas h-full min-h-0 w-full flex-1 overflow-hidden">
                    {children}
                </main>
            </div>

        </div>
    )
}
