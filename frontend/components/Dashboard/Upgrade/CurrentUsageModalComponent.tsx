export default function CurrentUsageModalComponent(){

    return(
        <div className="flex w-full max-w-4xl flex-col gap-y-3 rounded-md bg-white p-4 shadow-md">
            <p className={"font-semibold"}>Current usage</p>
            <div className="flex w-full flex-col gap-1 text-sm font-medium text-black/60 sm:flex-row sm:items-center sm:justify-between">
                <p>2 of 3 free resume generations used this month</p>
                <p>Resets May 1st</p>
            </div>
            <div className={"w-full h-2.5 rounded-full bg-[#ededed]"}>
                <div className={"z-10 w-2/3 bg-blue-700 h-2.5 rounded-full"}></div>
            </div>
            <p className={"text-xs text-black/60 font-medium text-center"}>Upgrade to Pro to unlock 100 tailored resumes per month</p>

        </div>
    )
}
