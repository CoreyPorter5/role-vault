"use client";

import Image from "next/image";
import {useState} from "react";

export default function AccountProfileAvatar({
    avatarUrl,
    initials,
    fullName,
}: {
    avatarUrl: string | null;
    initials: string;
    fullName: string;
}) {
    const [imageFailed, setImageFailed] = useState(false);

    if (!avatarUrl || imageFailed) {
        return (
            <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-[#2563EB] font-display text-lg font-semibold text-white">
                {initials}
            </div>
        );
    }

    return (
        <Image
            src={avatarUrl}
            alt={`${fullName}'s Google profile picture`}
            width={56}
            height={56}
            sizes="56px"
            className="size-14 shrink-0 rounded-full object-cover ring-1 ring-[#d8e5fb]"
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
        />
    );
}
