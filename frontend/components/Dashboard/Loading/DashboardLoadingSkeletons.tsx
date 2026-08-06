import Skeleton from "../../ui/Skeleton";

export function PipelineLoadingSkeleton() {
    return (
        <section aria-label="Loading applications" aria-busy="true" className="min-h-0 flex-1 pt-4">
            <span className="sr-only">Loading your applications</span>
            <div className="flex items-center justify-between gap-4">
                <Skeleton className="h-7 w-40"/>
                <Skeleton className="h-9 w-48"/>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {Array.from({length: 6}, (_, columnIndex) => (
                    <div key={columnIndex}>
                        <Skeleton className="h-7 w-24 rounded-full"/>
                        {columnIndex < 3 ? (
                            <div className="mt-3 h-44 rounded-lg bg-white p-3 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <Skeleton className="size-9"/>
                                    <Skeleton className="h-3 w-12"/>
                                </div>
                                <Skeleton className="mt-4 h-4 w-full"/>
                                <Skeleton className="mt-2 h-4 w-4/5"/>
                                <Skeleton className="mt-3 h-3 w-2/3"/>
                                <Skeleton className="mt-3 h-5 w-20 rounded-full"/>
                            </div>
                        ) : null}
                    </div>
                ))}
            </div>
        </section>
    );
}

export function LibraryLoadingSkeleton() {
    return (
        <section aria-label="Loading library items" aria-busy="true" className="space-y-4 pr-3">
            <span className="sr-only">Loading library items</span>
            {Array.from({length: 4}, (_, index) => (
                <div
                    key={index}
                    className="grid grid-cols-1 items-center gap-4 rounded-md bg-white px-4 py-4 shadow-sm md:grid-cols-[minmax(0,1.8fr)_minmax(0,0.7fr)_minmax(0,1fr)_minmax(0,0.8fr)] md:gap-x-6"
                >
                    <div className="flex items-center gap-4">
                        <Skeleton className="size-11 shrink-0"/>
                        <div className="min-w-0 flex-1">
                            <Skeleton className="h-4 w-3/4"/>
                            <Skeleton className="mt-2 h-3 w-1/2"/>
                        </div>
                    </div>
                    <Skeleton className="h-7 w-24 rounded-full"/>
                    <div>
                        <Skeleton className="h-4 w-28"/>
                        <Skeleton className="mt-2 h-3 w-36"/>
                    </div>
                    <div className="flex justify-end gap-3">
                        <Skeleton className="size-5"/>
                        <Skeleton className="size-5"/>
                        <Skeleton className="size-5"/>
                    </div>
                </div>
            ))}
        </section>
    );
}
