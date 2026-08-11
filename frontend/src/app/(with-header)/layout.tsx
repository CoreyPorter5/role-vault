import type {Metadata} from "next";
import React from "react";
import Header from "../../../components/Header/HeaderComponent";


export const metadata: Metadata = {
    title: "SeekSync",
    description: "A calmer way to manage your job search and tailor every application.",
};


export default function LandingPageLayout({children,}: Readonly<{ children: React.ReactNode; }>) {
    return (
        <>
            <Header/>
            {children}
        </>


    );
}
