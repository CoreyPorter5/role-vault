export default function CurrentUsageModalComponent(){

    return(
        <div className="app-panel flex w-full max-w-4xl flex-col gap-y-3 p-5">
            <p className={"font-semibold"}>Current usage</p>
            <div className="flex w-full flex-col gap-1 text-sm font-medium text-black/60 sm:flex-row sm:items-center sm:justify-between">
                <p>2 of 3 free resume generations used this month</p>
                <p>Resets May 1st</p>
            </div>
            <div className="h-2.5 w-full rounded-full bg-[#ebe9e4]">
                <div className="z-10 h-2.5 w-2/3 rounded-full bg-[#0D3880]"/>
            </div>
            <p className={"text-xs text-black/60 font-medium text-center"}>Upgrade to Pro to unlock 100 tailored resumes per month</p>

        </div>
    )
}
