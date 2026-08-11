import type {Metadata} from "next";
import "./globals.css";
import React from "react";
import {HomepageContextProvider} from "../../components/Context/HomepageContextProvider";
import {createClient} from "@/lib/supabase/server";
import ToastProvider from "../../components/ToastProvider";
import {Inter, Manrope} from "next/font/google";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-sans",
    display: "swap",
});

const manrope = Manrope({
    subsets: ["latin"],
    variable: "--font-display",
    display: "swap",
});


export const metadata: Metadata = {
    title: {
        default: "SeekSync — Track jobs. Tailor every application.",
        template: "%s | SeekSync",
    },
    description: "Save jobs from SEEK, organise your application pipeline, and create tailored resumes from one focused workspace.",
};


export default async function RootLayout({children,}: Readonly<{ children: React.ReactNode; }>) {

    const supabase = await createClient();
    const user = (await supabase.auth.getUser()).data.user

    return (
        <html lang="en" className={`${inter.variable} ${manrope.variable}`} data-scroll-behavior="smooth">
        <body className="antialiased">
        <HomepageContextProvider authUser={user}>
            {children}
            <ToastProvider/>
        </HomepageContextProvider>
        </body>
        </html>
    );
}
