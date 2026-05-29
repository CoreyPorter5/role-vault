import Link from "next/link";
import React, {useState} from "react";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {toast} from "sonner";
import {resetPasswordSchema, resetPasswordSchemaType} from "./schema";
import {useRouter} from "next/navigation";
import {createClient} from "@/lib/supabase/client";

export default function ResetPasswordComponent() {

    const [submitPressed, setSubmitPressed] = useState<boolean>(false)
    const router = useRouter();

    const {
        register,
        handleSubmit,
        formState: {errors, isSubmitting, isValid},
        reset,
        setError,
    } = useForm<resetPasswordSchemaType>({resolver: zodResolver(resetPasswordSchema),})

    const onSubmit = async (data: resetPasswordSchemaType) => {
        const parsed = resetPasswordSchema.safeParse(data)
        if(!parsed.success){
            return
        }
        const supabase = createClient();
        const { error } = await supabase.auth.updateUser({
            password: data.password
        })
        if(error){
            setError("root", {
                type: "server",
                message: "Something went wrong while resetting your password. Please try again"
            })
            return
        }

        await supabase.auth.signOut();

        toast.success("Successfully reset password!")
        reset();
        router.replace("/login?passwordReset=success")

    }

    return <section className={"flex w-3/7 min-h-[calc(100vh-80px)] items-center justify-center px-6"}>
        <div className={"flex w-full max-w-5xl items-stretch justify-center rounded-2xl shadow-md overflow-hidden"}>


            <form onSubmit={handleSubmit(onSubmit)}
                  className={"w-full bg-white px-20 py-8 gap-y-5 flex flex-col items-center justify-center"}>
                <div
                    className={"flex flex-col gap-y-2 md:items-center items-start self-start justify-center"}>
                    <h1 className={"text-2xl font-bold self-start"}>Reset your password</h1>
                </div>


                <div className={"flex justify-center gap-y-1 items-start flex-col w-full"}>
                    <p className={"font-semibold text-sm"}>New Password</p>
                    <input
                        {...register("password")}
                        placeholder={"•••••••••••"}
                        className={"outline-none w-full py-2 pl-3 text-sm rounded-md border border-gray-400/30"}
                        type="password"/>
                    {errors.password && submitPressed && (
                        <p className={"text-red-500 font-semibold text-sm self-center"}>
                            {errors.password.message}
                        </p>)}
                </div>


                <div className={"w-full flex items-center mt-2 justify-center"}>
                    <button onClick={() => setSubmitPressed(true)} type={"submit"} disabled={isSubmitting}
                            className={`${!isValid ? "bg-blue-700/60 hover:cursor-not-allowed" : "hover:cursor-pointer hover:translate-y-0.5 hover:opacity-60 transform duration-150 active:scale-95"} bg-blue-700 text-white py-2 rounded-md w-full`}>{isSubmitting ?
                        <p className={"animate-pulse font-bold text-sm"}>Sending...</p> :
                        <p className={"font-bold text-sm"}>Reset password</p>}
                    </button>
                </div>

            </form>


        </div>


    </section>

}