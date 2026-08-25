import type {Metadata} from "next";
import "./globals.css";
import React, {Suspense} from "react";
import {HomepageContextProvider} from "../../components/Context/HomepageContextProvider";
import ToastProvider from "../../components/ToastProvider";
import {Inter, Manrope} from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next"
import AnalyticsPageTracker from "../../components/Analytics/AnalyticsPageTracker";
import {GoogleAnalytics} from "@next/third-parties/google";

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
        default: "RoleVault — Track jobs. Tailor every application.",
        template: "%s | RoleVault",
    },
    description: "Save jobs from SEEK, organise your application pipeline, and create tailored resumes from one focused workspace.",
};


export default function RootLayout({children,}: Readonly<{ children: React.ReactNode; }>) {
    return (
        <html lang="en" className={`${inter.variable} ${manrope.variable}`} data-scroll-behavior="smooth">
        <body className="antialiased">
        <HomepageContextProvider authUser={null}>
            <Suspense fallback={null}>
                <AnalyticsPageTracker/>
            </Suspense>
            {children}
            <ToastProvider/>
            <SpeedInsights/>
        </HomepageContextProvider>
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID!}/>
        </body>
        </html>
    );
}
