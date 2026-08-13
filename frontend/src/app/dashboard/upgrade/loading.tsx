import Skeleton from "../../../../components/ui/Skeleton";

export default function UpgradeLoading() {
    return (
        <main className="flex h-full min-h-0 w-full flex-col items-center overflow-y-auto px-3 pb-10 pt-7 sm:px-6 lg:px-9 lg:pt-10">
            <span className="eyebrow">Plans built for momentum</span>
            <h1 className="mt-2 max-w-3xl text-center text-3xl font-[580] sm:text-5xl">
                Upgrade to create more application documents
            </h1>
            <p className="mt-3 max-w-2xl text-center font-medium leading-7 text-[#6c7179]">
                Get more resume and cover letter generations, DOCX downloads, and application tools to move faster
            </p>

            <section className="app-panel mt-7 w-full max-w-4xl p-5 sm:p-6" aria-label="Loading current usage" aria-busy="true">
                <span className="sr-only" role="status">Loading current usage</span>
                <Skeleton className="h-5 w-28"/>
                <Skeleton className="mt-2 h-4 w-72 max-w-full"/>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <UsageSkeleton/>
                    <UsageSkeleton/>
                </div>
            </section>

            <section className="mt-5 flex w-full max-w-5xl flex-col gap-5 lg:flex-row" aria-hidden="true">
                <PlanSkeleton/>
                <PlanSkeleton/>
            </section>
        </main>
    );
}

function UsageSkeleton() {
    return (
        <div className="rounded-xl border border-[#dfddd6] bg-[#faf9f6] p-4">
            <Skeleton className="h-4 w-28"/>
            <Skeleton className="mt-2 h-4 w-20"/>
            <Skeleton className="mt-4 h-2.5 w-full rounded-full"/>
            <Skeleton className="mt-2 h-3 w-20"/>
        </div>
    );
}

function PlanSkeleton() {
    return (
        <div className="app-panel w-full p-5 sm:p-8 lg:w-1/2">
            <div className="flex items-center justify-between gap-4">
                <Skeleton className="h-6 w-28"/>
                <Skeleton className="h-6 w-24 rounded-md"/>
            </div>
            <Skeleton className="mt-5 h-8 w-24"/>
            <div className="mt-6 space-y-4">
                {Array.from({length: 6}, (_, index) => <Skeleton key={index} className="h-4 w-4/5"/>)}
            </div>
            <Skeleton className="mt-8 h-11 w-full rounded-lg"/>
        </div>
    );
}
