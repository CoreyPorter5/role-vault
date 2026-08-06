"use client"

import { Toaster } from "sonner";

export default function ToastProvider(){
    return(
        <Toaster closeButton={true} richColors position={"bottom-right"}/>
    )
}