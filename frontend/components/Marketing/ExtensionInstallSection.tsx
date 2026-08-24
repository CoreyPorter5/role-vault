import Image from "next/image";
import {ArrowUpRight, Check, Download} from "lucide-react";
import {RoleVaultLogo} from "../BrandMark";

const CHROME_EXTENSION_URL = "https://chromewebstore.google.com/detail/hicmoallocpdeidjhhhdenhdkhllojpi?utm_source=item-share-cb";

export default function ExtensionInstallSection() {
    return (
        <section className="border-b border-[#e7e4dd] bg-[#f5f4f0] py-14 sm:py-18" aria-labelledby="extension-install-title">
            <div className="marketing-container">
                <div className="relative mx-auto flex max-w-5xl flex-col overflow-hidden rounded-2xl border border-[#d8d5cd] bg-white px-6 py-8 shadow-[0_24px_60px_-48px_rgba(37,99,235,0.55)] sm:px-9 sm:py-10 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
                    <div className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-[#dceaff]/65 blur-3xl" aria-hidden="true"/>

                    <div className="relative flex max-w-2xl items-start gap-4 sm:gap-5">
                        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-[#d8e5fb] bg-[#eff6ff] sm:size-14">
                            <RoleVaultLogo size={31}/>
                        </span>
                        <div>
                            <span className="eyebrow"><Download size={13}/> Chrome extension</span>
                            <h2 id="extension-install-title" className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#181d26] sm:text-3xl">
                                Keep RoleVault beside every job listing.
                            </h2>
                            <p className="mt-3 max-w-xl text-sm leading-6 text-[#666c75] sm:text-base">
                                Add the extension to save supported roles to your workspace without copying titles, descriptions or links by hand.
                            </p>
                            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-[#616770] sm:text-sm">
                                <span className="inline-flex items-center gap-1.5"><Check size={15} className="text-[#2563EB]"/> One-click role capture</span>
                                <span className="inline-flex items-center gap-1.5"><Check size={15} className="text-[#2563EB]"/> Free to install</span>
                            </div>
                        </div>
                    </div>

                    <div className="relative mt-7 shrink-0 sm:ml-17 lg:ml-0 lg:mt-0">
                        <a
                            href={CHROME_EXTENSION_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="button-primary group min-h-12 w-full px-6 sm:w-auto"
                            aria-label="Add RoleVault to Chrome from the Chrome Web Store (opens in a new tab)"
                        >
                            <Image
                                src="/brands/google-chrome.webp"
                                alt=""
                                width={22}
                                height={22}
                                className="shrink-0"
                                aria-hidden="true"
                            />
                            Add to Chrome
                            <ArrowUpRight size={17} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"/>
                        </a>
                        <p className="mt-2 text-center text-[11px] text-[#858990]">Opens the Chrome Web Store</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
