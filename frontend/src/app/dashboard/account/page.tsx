import ChangePasswordComponent from "../../../../components/Account/ChangePasswordComponent";

export default function AccountPage() {
    return (
        <main className={"w-full h-full min-h-0 gap-y-10 flex flex-col px-10 py-5"}>
            <div className={"shrink-0 flex flex-col gap-y-2"}>
                <h1 className={"font-bold text-3xl"}>Account</h1>
                <p className={"text-black/60 font-medium"}>Manage your account details and password.</p>
            </div>

            <ChangePasswordComponent/>

        </main>
    )
}