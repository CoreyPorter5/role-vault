import {Dispatch, SetStateAction} from "react";
import {PanelLeft} from "lucide-react";

type CollapseSidebarComponentProps = {
    handleToggle:  Dispatch<SetStateAction<boolean>>
    sidebarOpen: boolean

}

export default function CollapseSidebarComponent({handleToggle, sidebarOpen}: CollapseSidebarComponentProps){
    return(

        <PanelLeft className={` ${sidebarOpen ? "left-1/6" : "left-1/120"} hover:opacity-25 transform duration-300 ease-in-out bottom-1/26 hover:cursor-pointer absolute left-1/6 z-20 opacity-50`} size={20} onClick={() => handleToggle((prevState) => !prevState)}/>


    )


}