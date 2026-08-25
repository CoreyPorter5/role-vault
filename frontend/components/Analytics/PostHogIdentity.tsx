"use client";

import {useEffect} from "react";

import {identifyAnalyticsUser} from "@/lib/analytics/client";

export default function PostHogIdentity({userId}: {userId: string}) {
    useEffect(() => {
        identifyAnalyticsUser(userId);
    }, [userId]);

    return null;
}
