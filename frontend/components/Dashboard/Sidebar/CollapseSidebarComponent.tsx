import {Dispatch, SetStateAction} from "react";
import {PanelLeft} from "lucide-react";

type CollapseSidebarComponentProps = {
    handleToggle:  Dispatch<SetStateAction<boolean>>
    sidebarOpen: boolean

}

export default function CollapseSidebarComponent({handleToggle, sidebarOpen}: CollapseSidebarComponentProps){
    return(
        <button
            type="button"
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            onClick={() => handleToggle((prevState) => !prevState)}
            className={`absolute bottom-1/26 z-20 inline-flex size-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-[#0D3880] ${sidebarOpen ? "left-1/6" : "left-1/120"}`}
        >
            <PanelLeft size={20}/>
        </button>
    )
}
