import Image from "next/image";
import Link from "next/link";

export function RoleVaultLogo({size = 32}: {size?: number}) {
    return (
        <span
            aria-hidden="true"
            className="relative shrink-0 overflow-hidden rounded-[9px] bg-[#071226]"
            style={{width: size, height: size}}
        >
            <Image
                src="/rolevault-logo.png"
                alt=""
                fill
                sizes={`${size}px`}
                className="scale-[1.55] object-cover"
            />
        </span>
    );
}

export default function BrandMark({href = "/", compact = false}: {href?: string; compact?: boolean}) {
    return (
        <Link href={href} className="inline-flex min-w-0 items-center gap-2.5" aria-label="RoleVault home">
            <RoleVaultLogo/>
            {!compact ? (
                <span className="font-display italic whitespace-nowrap text-xl font-medium tracking-[-0.04em] text-[#181d26]">
                    RoleVault
                </span>
            ) : null}
        </Link>
    );
}
