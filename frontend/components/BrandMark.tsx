import Link from "next/link";

export default function BrandMark({href = "/", compact = false}: {href?: string; compact?: boolean}) {
    return (
        <Link href={href} className="inline-flex min-w-0 items-center gap-2.5" aria-label="RoleVault home">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-[#0D3880] text-sm font-extrabold text-white shadow-[inset_0_-1px_0_rgba(0,0,0,0.15)]">
                V
            </span>
            {!compact ? (
                <span className="font-display whitespace-nowrap text-xl font-semibold tracking-[-0.04em] text-[#181d26]">
                    RoleVault
                </span>
            ) : null}
        </Link>
    );
}
