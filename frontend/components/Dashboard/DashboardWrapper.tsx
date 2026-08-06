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
        <div className={"flex h-screen w-full relative overflow-hidden"}>
            <DashboardSidebar
                sidebarOpen={isOpen}
                mobileOpen={mobileSidebarOpen}
                onCloseMobile={() => setMobileSidebarOpen(false)}
                onToggleDesktop={() => setIsOpen((open) => !open)}
            />
            <div className={"flex flex-col flex-1 min-w-0"}>
                <DashboardHeader onOpenSidebar={() => setMobileSidebarOpen(true)}/>
                <main className={"bg-[#ededed] flex-1 min-h-0 h-full w-full overflow-hidden"}>
                    {children}
                </main>
            </div>

        </div>
    )
}
