import type {Metadata} from "next";
import Link from "next/link";
import {ArrowLeft, ExternalLink, ShieldCheck} from "lucide-react";
import type {ReactNode} from "react";

export const metadata: Metadata = {
    title: "Privacy & Legal",
    description: "How RoleVault collects, uses, stores, and shares information across its website, dashboard, and Chrome extension.",
};

const effectiveDate = "25 August 2026";

const tableOfContents = [
    ["scope", "Scope"],
    ["seek-relationship", "Our relationship with SEEK"],
    ["information", "Information we collect"],
    ["extension", "Chrome extension"],
    ["uses", "How we use information"],
    ["ai", "AI processing"],
    ["sharing", "When we share information"],
    ["overseas", "Overseas processing"],
    ["retention", "Retention and security"],
    ["choices", "Access, correction and deletion"],
    ["cookies", "Cookies and diagnostics"],
    ["complaints", "Questions and complaints"],
] as const;

const listClassName = "mt-4 list-disc space-y-2.5 pl-5 text-[15px] leading-7 text-[#4f5661] marker:text-[#2563EB]";

export default function PrivacyPage() {
    const privacyContactEmail = process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL?.trim();

    return (
        <div className="marketing-page min-h-screen">
            <main>
                <section className="relative overflow-hidden border-b border-[#e3e0d8] bg-[#f5f4f0] py-14 sm:py-20">
                    <div className="pointer-events-none absolute -right-20 -top-24 size-80 rounded-full bg-[#DBEAFE] opacity-80 blur-3xl"/>
                    <div className="marketing-container relative">
                        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#58606b] hover:text-[#2563EB]">
                            <ArrowLeft size={16}/>
                            Back to RoleVault
                        </Link>
                        <div className="mt-9 grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
                            <div className="max-w-3xl">
                                <span className="eyebrow">Privacy &amp; legal</span>
                                <h1 className="mt-4 text-balance text-4xl font-[580] leading-[1.03] tracking-[-0.045em] text-[#181d26] sm:text-6xl">
                                    Clear about your data and our independence.
                                </h1>
                                <p className="mt-6 max-w-2xl text-lg leading-8 text-[#59606a]">
                                    This policy explains how RoleVault handles personal information across the website, dashboard, resume and cover-letter tools, and Chrome extension.
                                </p>
                            </div>
                            <div className="rounded-xl border border-[#c8d7ee] bg-white p-5 shadow-[0_12px_35px_-28px_rgba(37,99,235,0.55)]">
                                <div className="flex items-center gap-3">
                                    <span className="flex size-10 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#2563EB]">
                                        <ShieldCheck size={21}/>
                                    </span>
                                    <div>
                                        <p className="text-sm font-semibold text-[#181d26]">Effective {effectiveDate}</p>
                                        <p className="mt-0.5 text-xs text-[#747982]">Applies to all RoleVault services</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="border-b border-[#e3e0d8] bg-[#fff9e8] py-7">
                    <div className="marketing-container">
                        <div className="rounded-xl border border-[#ead99d] bg-white px-5 py-5 sm:px-7">
                            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7a5b00]">Independent product notice</p>
                            <p className="mt-2 max-w-5xl text-[15px] leading-7 text-[#4f4a3d]">
                                <strong className="text-[#27241d]">RoleVault is an independent product and is not affiliated with, endorsed by, sponsored by, approved by, or operated by SEEK Limited or any member of the SEEK Group.</strong>{" "}
                                SEEK and its associated names, logos, and trade marks belong to their respective owners. References to SEEK only identify a third-party website with which RoleVault is designed to work.
                            </p>
                        </div>
                    </div>
                </section>

                <div className="marketing-container grid gap-10 py-12 lg:grid-cols-[240px_minmax(0,760px)] lg:justify-center lg:py-16">
                    <aside className="lg:sticky lg:top-24 lg:self-start">
                        <nav aria-label="Privacy policy sections" className="rounded-xl border border-[#dfddd6] bg-[#faf9f6] p-4">
                            <p className="px-2 text-xs font-bold uppercase tracking-[0.11em] text-[#767b82]">On this page</p>
                            <ol className="mt-3 space-y-1">
                                {tableOfContents.map(([id, label], index) => (
                                    <li key={id}>
                                        <a href={`#${id}`} className="flex rounded-lg px-2 py-2 text-sm leading-5 text-[#545b65] hover:bg-white hover:text-[#2563EB]">
                                            <span className="mr-2.5 text-[#9a9da2]">{String(index + 1).padStart(2, "0")}</span>
                                            {label}
                                        </a>
                                    </li>
                                ))}
                            </ol>
                        </nav>
                    </aside>

                    <article className="min-w-0">
                        <div className="mb-6 grid gap-3 sm:grid-cols-3">
                            {[
                                ["You stay in control", "Review and edit AI-generated resumes and cover letters before using them."],
                                ["No data sales", "We do not sell or rent your personal information."],
                                ["No automatic applications", "RoleVault does not submit job applications for you."],
                            ].map(([title, copy]) => (
                                <div key={title} className="rounded-xl border border-[#dfddd6] bg-[#faf9f6] p-4">
                                    <p className="text-sm font-semibold text-[#181d26]">{title}</p>
                                    <p className="mt-1.5 text-xs leading-5 text-[#6b7179]">{copy}</p>
                                </div>
                            ))}
                        </div>

                        <div className="overflow-hidden rounded-xl border border-[#dfddd6] bg-white">
                            <PolicySection id="scope" number="01" title="Scope and who we are">
                                <p>
                                    RoleVault (referred to as “RoleVault”, “we”, “us”, or “our”) operates a job-search organisation and resume-tailoring service. This policy applies when you visit our website, create an account, use the dashboard or resume tools, or use the RoleVault Chrome extension.
                                </p>
                                <p>
                                    We aim to handle personal information transparently and consistently with applicable privacy laws, including the Australian Privacy Principles where they apply. This policy does not limit any rights you have under law.
                                </p>
                            </PolicySection>

                            <PolicySection id="seek-relationship" number="02" title="Our relationship with SEEK">
                                <p>
                                    RoleVault is not part of SEEK and has no authority to speak or act for SEEK. SEEK does not operate, review, warrant, or support RoleVault. RoleVault’s website, extension, payments, AI features, and handling of information are solely our responsibility.
                                </p>
                                <p>
                                    Your use of SEEK remains subject to SEEK’s own terms, settings, and privacy practices. RoleVault does not control SEEK’s website or the accuracy, availability, or continued format of third-party job listings. You can review the independent{" "}
                                    <ExternalLinkAnchor href="https://www.seek.com.au/privacy/">SEEK Privacy Policy</ExternalLinkAnchor>.
                                </p>
                            </PolicySection>

                            <PolicySection id="information" number="03" title="Information we collect and hold">
                                <p>The information we handle depends on the features you choose to use and may include:</p>
                                <ul className={listClassName}>
                                    <li><strong>Account and identity information:</strong> name, email address, account identifier, authentication provider, account dates, document-credit balance, and generation usage.</li>
                                    <li><strong>Resume, cover-letter, and professional information:</strong> uploaded DOCX files, filenames, extracted and edited resume text, employment and education history, contact details, optional instructions you provide for a cover letter, generated drafts, and saved application documents.</li>
                                    <li><strong>Job-search information:</strong> the job identifier, title, company, location, work type, advertised pay, logo URL, description, sync date, application status, and resume category for jobs you save.</li>
                                    <li><strong>Billing information:</strong> Stripe customer, Checkout Session, PaymentIntent, event, credit-pack, amount, currency, purchase, and refund references. Stripe handles full payment-card details; RoleVault does not store your full card number.</li>
                                    <li><strong>Technical and security information:</strong> authentication sessions, necessary cookie data, request and device information made available to our infrastructure providers, and privacy-filtered error diagnostics.</li>
                                    <li><strong>Communications:</strong> information you include when making a support request, privacy request, or complaint.</li>
                                </ul>
                                <p>
                                    Resume content may contain sensitive information if you choose to include it. Please only provide information that is relevant to your job search and that you are comfortable asking us and our service providers to process.
                                </p>
                            </PolicySection>

                            <PolicySection id="extension" number="04" title="How the Chrome extension works">
                                <p>
                                    The extension is permitted to run on <code className="rounded bg-[#f2f1ed] px-1.5 py-0.5 text-[13px] text-[#343a43]">https://au.seek.com</code> so it can display the RoleVault sync control on supported job pages. When you choose “Sync to RoleVault”, it reads the currently displayed job listing and sends the relevant listing fields to your authenticated RoleVault account.
                                </p>
                                <p>
                                    RoleVault does not use the extension to submit applications, read your SEEK password, or collect an entire browsing history. The extension communicates with RoleVault’s website and API to check your signed-in session, sync jobs, display your saved jobs, and report limited, privacy-filtered technical failures.
                                </p>
                            </PolicySection>

                            <PolicySection id="uses" number="05" title="How we collect and use information">
                                <p>We collect information directly from you, from the job page you choose to sync, from Google if you use Google sign-in, and automatically from the operation and security of the service. We use it to:</p>
                                <ul className={listClassName}>
                                    <li>create and secure your account and keep you signed in;</li>
                                    <li>sync job listings and operate your application pipeline;</li>
                                    <li>store, extract, edit, classify, tailor, and export resumes and cover letters;</li>
                                    <li>manage document credits, one-time purchases, billing, refunds, and transaction records;</li>
                                    <li>provide support and respond to access, correction, or privacy requests;</li>
                                    <li>detect misuse, protect the service, diagnose failures, and improve reliability; and</li>
                                    <li>comply with legal obligations and enforce our rights.</li>
                                </ul>
                                <p>We do not sell or rent personal information, and we do not use it for third-party targeted advertising.</p>
                            </PolicySection>

                            <PolicySection id="ai" number="06" title="AI processing and automated suggestions">
                                <p>
                                    RoleVault uses artificial intelligence to classify a saved role into a resume category and to create tailored resume and cover-letter drafts. For classification, the job title and description are sent to our AI provider. For document generation, relevant job information, the text of your master resume, an available tailored resume, and any optional cover-letter note you provide may be sent to our AI provider so it can produce a structured draft.
                                </p>
                                <p>
                                    These features create recommendations and editable content; they do not make recruitment decisions, determine your eligibility for work, or submit an application. AI output can be incomplete or inaccurate. You remain responsible for reviewing the category, correcting the draft, and deciding whether and where to use it.
                                </p>
                            </PolicySection>

                            <PolicySection id="sharing" number="07" title="When we disclose information">
                                <p>We disclose information only as reasonably necessary to operate RoleVault, including to:</p>
                                <ul className={listClassName}>
                                    <li><ExternalLinkAnchor href="https://supabase.com/privacy">Supabase</ExternalLinkAnchor> for authentication, database, and file storage services;</li>
                                    <li><ExternalLinkAnchor href="https://openai.com/policies/privacy-policy/">OpenAI</ExternalLinkAnchor> for job classification, resume generation, and cover-letter generation;</li>
                                    <li><ExternalLinkAnchor href="https://stripe.com/au/privacy">Stripe</ExternalLinkAnchor> for one-time checkout, payment processing, refunds, and billing management;</li>
                                    <li><ExternalLinkAnchor href="https://sentry.io/privacy/">Sentry</ExternalLinkAnchor> for production error reporting with request content, credentials, cookies, and user-entered text removed by our diagnostic filters;</li>
                                    <li><ExternalLinkAnchor href="https://posthog.com/privacy">PostHog</ExternalLinkAnchor> (European Union hosting) for limited website and product analytics described below;</li>
                                    <li><ExternalLinkAnchor href="https://policies.google.com/privacy">Google</ExternalLinkAnchor> when you choose Google authentication, and to browser-extension distribution services when you install the extension;</li>
                                    <li>infrastructure, professional advisers, or contractors that need limited access to provide services to us and are subject to appropriate obligations;</li>
                                    <li>courts, regulators, law enforcement, or other parties where required or authorised by law; and</li>
                                    <li>a purchaser or successor in connection with a genuine business restructure, financing, merger, or sale, subject to appropriate confidentiality and notice where required.</li>
                                </ul>
                                <p>SEEK is not our service provider and does not receive your RoleVault account, resume, credit, or payment information from us merely because a job was synced.</p>
                            </PolicySection>

                            <PolicySection id="overseas" number="08" title="Overseas processing">
                                <p>
                                    Some providers operate global infrastructure. Personal information may therefore be processed outside Australia, including in Ireland or elsewhere in the European Union, the United States, and other countries in which a provider or its approved subprocessors operate. The exact locations may change as providers update their infrastructure.
                                </p>
                                <p>
                                    Where applicable, we take reasonable steps to use reputable providers and contractual or technical safeguards appropriate to the information and service involved. Overseas privacy protections may differ from Australian law.
                                </p>
                            </PolicySection>

                            <PolicySection id="retention" number="09" title="Retention and security">
                                <p>
                                    We generally keep account, job, resume, cover-letter, credit-purchase, transaction, and generation records while your account is active or for as long as reasonably needed to provide the service, maintain billing and security records, resolve disputes, and comply with legal obligations. Draft resumes and cover letters carry a one-month product expiry and stop appearing in the active draft library after expiry; technical deletion may occur later.
                                </p>
                                <p>
                                    Deleting a saved job also removes its associated draft, generated-resume, and generated-cover-letter records from the active service. Residual copies may remain temporarily in protected backups, provider systems, or security logs before routine expiry. Information may also be retained where law requires it or where reasonably necessary to establish, exercise, or defend legal claims.
                                </p>
                                <p>
                                    We use measures such as authenticated access, user-scoped database controls, restricted storage links, provider access controls, and diagnostic redaction. No internet transmission or storage system is completely secure, so we cannot guarantee absolute security.
                                </p>
                            </PolicySection>

                            <PolicySection id="choices" number="10" title="Access, correction, deletion, and control">
                                <p>
                                    You can review much of your account, job, resume, cover-letter, credit, and billing information in the dashboard. Available controls let you edit document text, change job status, replace content, and delete individual jobs or generated application documents.
                                </p>
                                <p>
                                    You may also ask us for access to personal information we hold about you, request correction of information that is inaccurate or incomplete, or request deletion of your account and associated information. We may need to verify your identity and may retain limited information where legally required or reasonably necessary. If we cannot fulfil a request, we will explain why where required by law.
                                </p>
                            </PolicySection>

                            <PolicySection id="cookies" number="11" title="Cookies, sessions, and diagnostics">
                                <p>
                                    RoleVault uses cookies and similar session mechanisms that are necessary for authentication, security, and extension sign-in. We do not currently use advertising cookies. Your browser settings can block cookies, but blocking required cookies may prevent account and extension features from working.
                                </p>
                                <p>
                                    Production error reporting is configured to remove request bodies, headers, cookies, query strings, user-entered content, and direct user identity from diagnostic events. Providers may still process limited technical information needed to receive and secure those events.
                                </p>
                                <p>
                                    We use PostHog to understand whether people reach important product milestones and where the landing-page journey becomes unclear. We send a pseudonymous account identifier after sign-in, route paths without query strings, selected campaign fields (source, medium, and campaign), landing-page section and scroll milestones, and named actions such as registration, extension authentication, job sync, resume upload, document generation, checkout, and purchase. We do not send resume or cover-letter content, job descriptions, filenames, email addresses, payment identifiers, or full URLs to PostHog. Automatic click capture and session replay are disabled.
                                </p>
                            </PolicySection>

                            <PolicySection id="complaints" number="12" title="Questions, privacy requests, and complaints">
                                <p>
                                    Contact us if you have a privacy question, want this policy in another accessible form, wish to exercise a privacy right, or believe your information has been mishandled. Include enough detail for us to identify the account and understand the request, but do not send passwords or unnecessary sensitive information.
                                </p>
                                <div className="mt-5 rounded-xl border border-[#c8d7ee] bg-[#f2f6fc] p-5">
                                    <p className="text-sm font-semibold text-[#181d26]">Privacy contact</p>
                                    {privacyContactEmail ? (
                                        <a className="mt-2 inline-flex text-sm font-semibold text-[#2563EB] underline decoration-[#93C5FD] underline-offset-4 hover:text-[#1D4ED8]" href={`mailto:${privacyContactEmail}`}>
                                            {privacyContactEmail}
                                        </a>
                                    ) : (
                                        <p className="mt-2 text-sm leading-6 text-[#525a65]">
                                            Use the monitored support email published on RoleVault’s official website or product listing.
                                        </p>
                                    )}
                                </div>
                                <p>
                                    We will acknowledge a complaint, investigate it, and explain the outcome within a reasonable period. If you are not satisfied, you may be able to complain to the{" "}
                                    <ExternalLinkAnchor href="https://www.oaic.gov.au/privacy/privacy-complaints">Office of the Australian Information Commissioner</ExternalLinkAnchor> or another regulator with jurisdiction over your complaint.
                                </p>
                                <p>
                                    We may update this policy when the service or legal requirements change. Material changes will be identified by updating the effective date and, where appropriate, providing additional notice.
                                </p>
                            </PolicySection>
                        </div>

                        <p className="mt-6 text-sm leading-6 text-[#757a82]">
                            This policy is written to provide the information commonly expected in an Australian privacy policy. The{" "}
                            <ExternalLinkAnchor href="https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/more-guidance/guide-to-developing-an-app-privacy-policy">
                                OAIC privacy-policy guide
                            </ExternalLinkAnchor>{" "}
                            provides more information about Australian requirements.
                        </p>
                    </article>
                </div>
            </main>

            <footer className="border-t border-[#e4e1da] py-9">
                <div className="marketing-container flex flex-col justify-between gap-5 text-sm text-[#666b73] sm:flex-row sm:items-center">
                    <div>
                        <p className="font-display text-base font-semibold text-[#181d26]">RoleVault</p>
                        <p className="mt-1">Independent from SEEK Limited and the SEEK Group.</p>
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-2">
                        <Link href="/" className="hover:text-[#2563EB]">Home</Link>
                        <Link href="/pricing" className="hover:text-[#2563EB]">Pricing</Link>
                        <Link href="/privacy" aria-current="page" className="font-semibold text-[#2563EB]">Privacy &amp; legal</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}

function PolicySection({
    id,
    number,
    title,
    children,
}: {
    id: string;
    number: string;
    title: string;
    children: ReactNode;
}) {
    return (
        <section id={id} className="scroll-mt-28 border-b border-[#e7e4dd] px-5 py-8 last:border-b-0 sm:px-8 sm:py-10">
            <div className="flex items-baseline gap-3">
                <span className="font-display text-xs font-bold text-[#9a9da2]">{number}</span>
                <h2 className="text-2xl font-semibold text-[#181d26] sm:text-[1.7rem]">{title}</h2>
            </div>
            <div className="mt-5 space-y-4 text-[15px] leading-7 text-[#4f5661]">
                {children}
            </div>
        </section>
    );
}

function ExternalLinkAnchor({href, children}: {href: string; children: ReactNode}) {
    return (
        <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-baseline gap-1 font-semibold text-[#2563EB] underline decoration-[#93C5FD] underline-offset-4 hover:text-[#1D4ED8]">
            {children}
            <ExternalLink size={12} aria-hidden="true"/>
        </a>
    );
}
