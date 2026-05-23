export default function CurrentUsageModalComponent(){

    return(
        <div className={"bg-white rounded-md shadow-md min-w-2/3 p-4 flex flex-col gap-y-3"}>
            <p className={"font-semibold"}>Current usage</p>
            <div className={"w-full flex text-sm text-black/60 font-medium justify-between items-center"}>
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