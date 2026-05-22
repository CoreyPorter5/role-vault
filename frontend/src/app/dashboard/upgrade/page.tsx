import CurrentUsageModalComponent from "../../../../components/Dashboard/Upgrade/CurrentUsageModalComponent";
import PricingTierModalComponent from "../../../../components/Dashboard/Upgrade/PricingTierModelComponent";

export default function UpgradePage(){



    return <main className={"px-10 pt-5 pb-10 flex items-center flex-col gap-y-3 justify-center w-full "}>
        <h1 className={"text-3xl font-bold"}>Upgrade to generate more tailored resumes</h1>
        <h2 className={"font-semibold max-w-1/2 text-center text-black/60"}>Get more resume generations, DOCX downloads, and application tools to move faster</h2>
        <CurrentUsageModalComponent/>
        <PricingTierModalComponent/>
    </main>
}