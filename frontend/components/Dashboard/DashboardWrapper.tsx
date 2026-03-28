import DashboardHeader from "./Header/DashboardHeader";
import DashboardSidebar from "./Sidebar/DashboardSidebar";
import React from "react";


type DashboardWrapperProps = {
    children: React.ReactNode;
}

export default function DashboardWrapper({children}: DashboardWrapperProps) {
    return (
        <div className={"flex h-screen w-full overflow-hidden"}>
            <DashboardSidebar/>
            <div className={"flex flex-col flex-1 min-w-0"}>
                <DashboardHeader/>
                <main className={`bg-[#ededed] flex-1 items-center h-full w-full overflow-y-auto justify-center`}>
                    {children}
                </main>
            </div>

        </div>
    )
}

