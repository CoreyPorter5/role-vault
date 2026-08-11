import Skeleton from "../../../../components/ui/Skeleton";

export default function AccountLoading() {
    return (
        <main className="flex h-full min-h-0 w-full flex-col overflow-y-auto px-3 py-5 sm:px-6 lg:px-9 lg:py-8">
            <div className="flex shrink-0 flex-col gap-y-2">
                <span className="eyebrow">Personal settings</span>
                <h1 className="page-title mt-1">Account</h1>
                <p className="font-medium text-[#6c7179]">
                    Review your profile, plan allowance, and security settings.
                </p>
            </div>

            <section aria-label="Loading account details" aria-busy="true">
                <span className="sr-only" role="status">
                    Loading account details
                </span>

                <div className="mt-7 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
                    <div className="flex min-w-0 flex-col gap-5">
                        <section className="app-panel overflow-hidden">
                            <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                                <div className="flex min-w-0 items-center gap-4">
                                    <Skeleton className="size-14 shrink-0 rounded-xl"/>
                                    <div className="min-w-0 flex-1">
                                        <Skeleton className="h-3 w-24"/>
                                        <Skeleton className="mt-2 h-6 w-44 max-w-full"/>
                                        <Skeleton className="mt-2 h-4 w-56 max-w-full"/>
                                    </div>
                                </div>
                                <Skeleton className="h-7 w-20 rounded-md"/>
                            </div>

                            <div className="grid border-t border-[#dfddd6] sm:grid-cols-2">
                                <AccountDetailSkeleton/>
                                <AccountDetailSkeleton/>
                                <AccountDetailSkeleton/>
                                <AccountDetailSkeleton/>
                            </div>
                        </section>

                        <section className="app-panel p-5 sm:p-6">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0 flex-1">
                                    <Skeleton className="h-3 w-32"/>
                                    <Skeleton className="mt-2 h-6 w-44 max-w-full"/>
                                    <Skeleton className="mt-2 h-4 w-96 max-w-full"/>
                                </div>
                                <Skeleton className="h-10 w-32 rounded-lg"/>
                            </div>

                            <div className="mt-6 grid gap-5 md:grid-cols-[170px_minmax(0,1fr)] md:items-center">
                                <div className="rounded-xl border border-[#d8e1ef] bg-[#edf3fb] p-4">
                                    <Skeleton className="h-10 w-16 bg-[#d6e1f2]"/>
                                    <Skeleton className="mt-2 h-4 w-24 bg-[#d6e1f2]"/>
                                </div>

                                <div className="min-w-0">
                                    <div className="flex items-center justify-between gap-4">
                                        <Skeleton className="h-4 w-24"/>
                                        <Skeleton className="h-4 w-32 max-w-[45%]"/>
                                    </div>
                                    <Skeleton className="mt-3 h-2.5 w-full rounded-full"/>
                                    <Skeleton className="mt-4 h-4 w-full"/>
                                    <Skeleton className="mt-2 h-4 w-4/5"/>
                                </div>
                            </div>
                        </section>
                    </div>

                    <section className="app-panel w-full p-5 sm:p-6">
                        <div className="flex flex-col gap-y-5">
                            <div>
                                <Skeleton className="h-3 w-16"/>
                                <Skeleton className="mt-2 h-6 w-40"/>
                                <Skeleton className="mt-2 h-4 w-full"/>
                            </div>

                            <PasswordFieldSkeleton labelWidth="w-28"/>
                            <PasswordFieldSkeleton labelWidth="w-24" showHint/>
                            <PasswordFieldSkeleton labelWidth="w-36"/>

                            <Skeleton className="mt-1 h-11 w-full rounded-lg"/>
                        </div>
                    </section>
                </div>
            </section>
        </main>
    );
}

function AccountDetailSkeleton() {
    return (
        <div className="border-b border-[#dfddd6] px-5 py-4 last:border-b-0 sm:px-6 sm:[&:nth-child(odd)]:border-r sm:[&:nth-child(n+3)]:border-b-0">
            <Skeleton className="h-3 w-20"/>
            <Skeleton className="mt-2 h-4 w-32 max-w-full"/>
        </div>
    );
}

function PasswordFieldSkeleton({
                                   labelWidth,
                                   showHint = false,
                               }: {
    labelWidth: string;
    showHint?: boolean;
}) {
    return (
        <div>
            <Skeleton className={`h-4 ${labelWidth}`}/>
            <Skeleton className="mt-2 h-11 w-full rounded-lg"/>
            {showHint ? <Skeleton className="mt-2 h-3 w-36"/> : null}
        </div>
    );
}
