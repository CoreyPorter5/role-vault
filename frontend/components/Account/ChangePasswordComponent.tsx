"use client"

import {useForm} from "react-hook-form";
import {changePasswordSchema, changePasswordSchemaType} from "./schema";
import {zodResolver} from "@hookform/resolvers/zod";
import {toast} from "sonner"
import {createClient} from "@/lib/supabase/client";

export default function ChangePasswordComponent() {


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

    return (
        <section className={"bg-white self-center shadow-md w-2/3 rounded-lg px-10 py-5"}>
            <form onSubmit={handleSubmit(onSubmit)} className={"flex items-start justify-center flex-col gap-y-7"}>
                <h2 className={"font-semibold text-lg"}>Change Password</h2>
                <div className={"flex items-start w-full justify-center flex-col gap-y-2"}>
                    <p className={"text-black/60 font-semibold text-sm"}>Current password</p>
                    <input {...register("oldPassword")}
                           className={"w-full rounded-md py-3 px-5 outline-none bg-[#ededed]"} type="password"/>
                    {errors.oldPassword && (
                        <p className="text-xs text-red-500">{errors.oldPassword.message}</p>
                    )}
                </div>
                <div className={"flex items-start w-full justify-center flex-col gap-y-2"}>
                    <p className={"text-black/60 font-semibold text-sm"}>New password</p>
                    <input {...register("newPassword")}
                           className={"w-full rounded-md py-3 px-5 outline-none bg-[#ededed]"} type="password"/>
                    <p className={"text-xs text-black/60"}>Use at least 10 characters.</p>
                    {errors.newPassword && (
                        <p className="text-xs text-red-500">{errors.newPassword.message}</p>
                    )}
                </div>
                <div className={"flex items-start w-full justify-center flex-col gap-y-2"}>
                    <p className={"text-black/60 font-semibold text-sm"}>Confirm new password</p>
                    <input {...register("newConfirmPassword")}
                           className={"w-full rounded-md py-3 px-5 outline-none bg-[#ededed]"} type="password"/>
                    <p className={"text-xs text-black/60"}>Use at least 10 characters.</p>
                    {errors.newConfirmPassword && (
                        <p className="text-xs text-red-500">{errors.newConfirmPassword.message}</p>
                    )}
                </div>


                <button
                    disabled={isSubmitting}
                    type={"submit"}
                    className={"self-end bg-blue-700 rounded-md py-2 text-white text-sm font-semibold hover:cursor-pointer px-4"}>
                    {isSubmitting ? "Submitting" : "Update Password"}
                </button>
            </form>

        </section>
    )
}