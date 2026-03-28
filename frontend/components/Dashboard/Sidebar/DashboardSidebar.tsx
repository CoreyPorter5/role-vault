"use client"

import {useState} from "react";
import CollapseSidebarComponent from "./CollapseSidebarComponent";

export default function DashboardSidebar(){
    const [isOpen, setIsOpen] = useState<boolean>(true);


    return(
        <aside className={`${isOpen ? "w-1/5" : "w-0"} h-full transform duration-200 items-center justify-center relative bg-white text-white shrink-0 flex flex-col`}>
            <CollapseSidebarComponent handleToggle={setIsOpen}/>
            <div className={"text-6xl text-black"}>sdf</div>
        </aside>
    )
}