import {DocumentTextIcon} from "@heroicons/react/24/outline";

export default function BillingHistoryComponent(){
    return(
        <section className="app-panel flex h-full min-h-56 w-full flex-col items-start justify-center gap-y-4 p-4 sm:p-6">
            <p className={"text-lg font-bold shrink-0"}>Billing History</p>
            <div className="flex w-full flex-1 flex-col items-center justify-center gap-y-3 rounded-lg border border-[#dedbd3] bg-[#f8f7f4]">
                <div className={"p-3 rounded-2xl bg-gray-500/10"}>
                    <DocumentTextIcon className={"text-black opacity-60"} width={24} height={24}/>
                </div>
                <p className="px-4 text-center text-sm font-medium text-black/60">Invoices and receipts will appear here once available.</p>

            </div>
        </section>
    )
}
