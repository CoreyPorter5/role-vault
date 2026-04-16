"use client"

import DashboardHeader from "./Header/DashboardHeader";
import DashboardSidebar from "./Sidebar/DashboardSidebar";
import React from "react";
import CollapseSidebarComponent from "./Sidebar/CollapseSidebarComponent";
import {useJWKTokenAndUserAndSidebar} from "./Context/DashboardContextProvider";


type DashboardWrapperProps = {
    children: React.ReactNode;
}



export default function DashboardWrapper({children}: DashboardWrapperProps) {
    const {sidebarOpen: isOpen, setSidebarOpen: setIsOpen} = useJWKTokenAndUserAndSidebar()
    return (
        <div className={"flex h-screen w-full relative overflow-hidden"}>
            <DashboardSidebar sidebarOpen={isOpen}/>
            <CollapseSidebarComponent sidebarOpen={isOpen} handleToggle={setIsOpen}/>
            <div className={"flex flex-col flex-1 min-w-0"}>
                <DashboardHeader/>
                <main className={"bg-[#ededed] flex-1 min-h-0 h-full w-full overflow-hidden"}>
                    {children}
                </main>
            </div>

        </div>
    )
}
