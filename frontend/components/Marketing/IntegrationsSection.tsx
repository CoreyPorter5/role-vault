const integrations = [
    {
        name: "SEEK",
        status: "One-click sync",
        wordmark: <span className="text-[2rem] font-black lowercase tracking-[-0.08em]">seek</span>,
    },
    {
        name: "Indeed",
        status: "Paste listing",
        wordmark: (
            <span className="text-[2rem] font-bold lowercase tracking-[-0.055em]">
                indeed
            </span>
        ),
    },
    {
        name: "LinkedIn",
        status: "Paste listing",
        wordmark: (
            <span className="inline-flex items-center text-[1.85rem] font-bold tracking-[-0.055em]">
                Linked<span className="ml-1 inline-flex size-8 items-center justify-center rounded-[4px] bg-[#17191d] text-[1.15rem] tracking-normal text-white">in</span>
            </span>
        ),
    },
];

export default function IntegrationsSection() {
    return (
        <section data-analytics-section="integrations" className="border-b border-[#e7e4dd] bg-white py-14 sm:py-16" aria-labelledby="integrations-title">
            <div className="marketing-container">
                <div className="mx-auto max-w-3xl text-center">
                    <span className="eyebrow">Integrations</span>
                    <h2 id="integrations-title" className="mt-3 text-3xl font-[560] tracking-[-0.035em] sm:text-4xl">
                        Add jobs from anywhere
                    </h2>
                    <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#70757d] sm:text-base">
                        Save SEEK listings in one click, or paste a job from LinkedIn, Indeed, SEEK Grad, CareerHub, email or any employer website.
                    </p>
                </div>

                <div className="mx-auto mt-9 grid max-w-4xl gap-px overflow-hidden rounded-2xl border border-[#dfddd6] bg-[#dfddd6] sm:grid-cols-3">
                    {integrations.map((integration) => (
                        <div key={integration.name} className="flex min-h-32 flex-col items-center justify-center bg-[#fafafa] px-6 py-7 text-[#17191d]">
                            <div aria-label={`${integration.name} logo`} className="flex min-h-11 items-center opacity-90 grayscale">
                                {integration.wordmark}
                            </div>
                            <span className={`mt-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${
                                integration.status === "One-click sync"
                                    ? "bg-[#e8f1ff] text-[#2563EB]"
                                    : "bg-[#ecebe7] text-[#77736b]"
                            }`}>
                                {integration.status}
                            </span>
                        </div>
                    ))}
                </div>

                <p className="mt-5 text-center text-xs text-[#92959a]">
                    Third-party names and trade marks belong to their respective owners.
                </p>
            </div>
        </section>
    );
}
