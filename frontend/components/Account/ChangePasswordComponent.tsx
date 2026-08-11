"use client"

import {useForm} from "react-hook-form";
import {changePasswordSchema, changePasswordSchemaType} from "./schema";
import {zodResolver} from "@hookform/resolvers/zod";
import {toast} from "sonner"
import {createClient} from "@/lib/supabase/client";
import {captureAppError} from "@/lib/sentry/captureAppError";

export default function ChangePasswordComponent({canChangePassword = true}: {canChangePassword?: boolean}) {


    const {register, handleSubmit, reset, formState: {errors, isSubmitting},} = useForm<changePasswordSchemaType>({
        resolver: zodResolver(changePasswordSchema),
        defaultValues: {
            oldPassword: "",
            newPassword: "",
            newConfirmPassword: "",
        },
    });

    const onSubmit = async (values: changePasswordSchemaType) => {


        const changePasswordPromise = async () => {
            const supabase = createClient();
            const {error} = await supabase.auth.updateUser({
                password: values.newPassword,
                current_password: values.oldPassword,
            })

            if (error) {
                console.error("Error changing password:", error.message);
                captureAppError({
                    message: "Failed to change user password",
                    area: "user_account_page",
                    action: "change_user_password",
                    endpoint: "supabase:auth_updateUser",
                    status: error.status,
                    statusText: error.message,
                    extra: {
                        error,
                    }
                })
                throw new Error(error.message);
            }

            reset();
        }

        toast.promise(changePasswordPromise(), {
            loading: "Changing password...",
            success: "Password changed successfully",
            error: "Error changing password. Please try again"
        })


    }

    if (!canChangePassword) {
        return (
            <section className="app-panel w-full p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#0D3880]">Security</p>
                <h2 className="mt-1 text-xl font-semibold text-[#181d26]">Password managed externally</h2>
                <p className="mt-2 text-sm leading-6 text-[#6f747c]">
                    You sign in through an external provider, so there is no SeekSync password to change. Update your password with that provider instead.
                </p>
            </section>
        );
    }

    return (
        <section className="app-panel w-full p-5 sm:p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-y-5">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#0D3880]">Security</p>
                    <h2 className="mt-1 text-xl font-semibold text-[#181d26]">Change password</h2>
                    <p className="mt-1 text-sm leading-6 text-[#6f747c]">Choose a unique password you do not use elsewhere.</p>
                </div>
                <div className="flex w-full flex-col gap-y-2">
                    <label htmlFor="current-password" className="text-sm font-medium text-[#3f4651]">Current password</label>
                    <input {...register("oldPassword")}
                           id="current-password"
                           autoComplete="current-password"
                           className="h-11 w-full rounded-lg border border-[#cbc8c0] bg-[#faf9f6] px-4 outline-none focus:border-[#0D3880]" type="password"/>
                    {errors.oldPassword && (
                        <p role="alert" className="text-xs text-red-600">{errors.oldPassword.message}</p>
                    )}
                </div>
                <div className="flex w-full flex-col gap-y-2">
                    <label htmlFor="new-password" className="text-sm font-medium text-[#3f4651]">New password</label>
                    <input {...register("newPassword")}
                           id="new-password"
                           autoComplete="new-password"
                           className="h-11 w-full rounded-lg border border-[#cbc8c0] bg-[#faf9f6] px-4 outline-none focus:border-[#0D3880]" type="password"/>
                    <p className="text-xs text-[#6f747c]">Use at least 10 characters.</p>
                    {errors.newPassword && (
                        <p role="alert" className="text-xs text-red-600">{errors.newPassword.message}</p>
                    )}
                </div>
                <div className="flex w-full flex-col gap-y-2">
                    <label htmlFor="confirm-new-password" className="text-sm font-medium text-[#3f4651]">Confirm new password</label>
                    <input {...register("newConfirmPassword")}
                           id="confirm-new-password"
                           autoComplete="new-password"
                           className="h-11 w-full rounded-lg border border-[#cbc8c0] bg-[#faf9f6] px-4 outline-none focus:border-[#0D3880]" type="password"/>
                    {errors.newConfirmPassword && (
                        <p role="alert" className="text-xs text-red-600">{errors.newConfirmPassword.message}</p>
                    )}
                </div>


                <button
                    disabled={isSubmitting}
                    type={"submit"}
                    className="button-primary mt-1 w-full px-5 disabled:opacity-60">
                    {isSubmitting ? "Updating password" : "Update password"}
                </button>
            </form>

        </section>
    )
}
