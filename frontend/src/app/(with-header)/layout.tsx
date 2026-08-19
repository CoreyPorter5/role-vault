import type {Metadata} from "next";
import React from "react";
import Header from "../../../components/Header/HeaderComponent";


export const metadata: Metadata = {
    title: {
        absolute: "SeekSync — Track jobs. Tailor every application.",
    },
    description: "Save jobs from SEEK, organise your application pipeline, and create tailored resumes and cover letters from one focused workspace.",
};


export default function LandingPageLayout({children,}: Readonly<{ children: React.ReactNode; }>) {
    return (
        <>
            <Header/>
            {children}
        </>


    );
}
