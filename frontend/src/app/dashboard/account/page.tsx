import ChangePasswordComponent from "../../../../components/Account/ChangePasswordComponent";

export default function AccountPage() {
    return (
        <main className="flex h-full min-h-0 w-full flex-col gap-y-10 overflow-y-auto px-3 py-5 sm:px-6 lg:px-10">
            <div className={"shrink-0 flex flex-col gap-y-2"}>
                <h1 className={"font-bold text-3xl"}>Account</h1>
                <p className={"text-black/60 font-medium"}>Manage your account details and password.</p>
            </div>

            <ChangePasswordComponent/>

        </main>
    )
}
