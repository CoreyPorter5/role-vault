import {DocumentTextIcon} from "@heroicons/react/24/outline";

export default function BillingHistoryComponent(){
    return(
        <section className={"bg-white rounded-md w-full flex h-full flex-col items-start justify-center gap-y-4 p-6"}>
            <p className={"text-lg font-bold shrink-0"}>Billing History</p>
            <div className={"bg-[#ededed] items-center gap-y-3 justify-center flex flex-col flex-1 w-full rounded-md"}>
                <div className={"p-3 rounded-2xl bg-gray-500/10"}>
                    <DocumentTextIcon className={"text-black opacity-60"} width={24} height={24}/>
                </div>
                <p className={"font-medium text-sm text-black/60"}>Invoices and receipts will appear here once available.</p>

            </div>
        </section>
    )
}