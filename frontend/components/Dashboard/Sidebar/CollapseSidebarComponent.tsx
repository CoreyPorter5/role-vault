import {Dispatch, SetStateAction} from "react";
import {PanelLeft} from "lucide-react";

type CollapseSidebarComponentProps = {
    handleToggle:  Dispatch<SetStateAction<boolean>>

}

export default function CollapseSidebarComponent({handleToggle}: CollapseSidebarComponentProps){
    return(

        <PanelLeft className={"invert bottom-6 absolute right-4"} size={20} onClick={() => handleToggle((prevState) => !prevState)}/>
    )




}