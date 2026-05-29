"use client"

import React, {useState} from "react";
import Link from "next/link";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {forgotPasswordSchema, forgotPasswordSchemaType} from "./schema";
import sendPasswordResetLink from "./actions";
import {toast} from "sonner";
import {ArrowLeft} from "lucide-react";

export default function ForgottenPasswordComponent() {
    const [submitPressed, setSubmitPressed] = useState<boolean>(false)

    const {
        register,
        handleSubmit,
        formState: {errors, isSubmitting, isValid},
        reset,
        setError,
    } = useForm<forgotPasswordSchemaType>({resolver: zodResolver(forgotPasswordSchema),})

    const onSubmit = async (data: forgotPasswordSchemaType) => {
        const response = await sendPasswordResetLink(data);
        if (!response.ok) {
            if (response.formError) {
                setError("root", {
                    type: "server",
                    message: response.formError
                })

            } else if (response.fieldErrors) {
                Object.entries(response.fieldErrors).forEach(([fieldName, errorMessage]) => {
                    if (errorMessage) {
                        setError(fieldName as keyof forgotPasswordSchemaType, {
                            type: "server",
                            message: errorMessage,
                        });
                    }
                });
            }

            return
        }

        toast.success("Successfully sent reset password link!")
        reset();
    }

    return <section className={"flex w-3/7 min-h-[calc(100vh-80px)] items-center justify-center px-6"}>
        <div className={"flex w-full max-w-5xl items-stretch justify-center rounded-2xl shadow-md overflow-hidden"}>


            <form onSubmit={handleSubmit(onSubmit)}
                  className={"w-full bg-white px-20 py-8 gap-y-5 flex flex-col items-center justify-center"}>
                <div
                    className={"flex flex-col gap-y-2 md:items-center items-start self-start justify-center"}>
                    <h1 className={"text-2xl font-bold self-start"}>Reset your password</h1>
                    <p className={`text-black/60 text-sm`}>Enter the email address associated with your account and
                        we&#39;ll send you a link to reset your password.</p>
                </div>


                <div className={"flex justify-center gap-y-1 items-start flex-col w-full"}>
                    <p className={"font-semibold text-sm"}>Email Address</p>
                    <input
                        {...register("email")}
                        placeholder={"you@example.com"}
                        className={"outline-none w-full py-2 pl-3 text-sm rounded-md border border-gray-400/30"}
                        type="text"/>
                    {errors.email && submitPressed && (<p className={"text-red-500 font-semibold text-sm self-center"}>
                        {errors.email.message}
                    </p>)}
                </div>


                <div className={"w-full flex items-center mt-2 justify-center"}>
                    <button onClick={() => setSubmitPressed(true)} type={"submit"} disabled={isSubmitting}
                            className={`${!isValid ? "bg-blue-700/60 hover:cursor-not-allowed" : "hover:cursor-pointer hover:translate-y-0.5 hover:opacity-60 transform duration-150 active:scale-95"} bg-blue-700 text-white py-2 rounded-md w-full`}>{isSubmitting ?
                        <p className={"animate-pulse font-bold text-sm"}>Sending...</p> :
                        <p className={"font-bold text-sm"}>Send reset link</p>}
                    </button>
                </div>


                <div className={"mt-3 self-start"}>
                    <Link className={"font-semibold flex gap-x-2 items-center justify-center text-black text-sm"} href={"/login"}>
                        <ArrowLeft width={16} height={16}/>
                        Back to log in
                    </Link>
                </div>


            </form>


        </div>


    </section>
}