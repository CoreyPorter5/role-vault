"use client"

import React, {useState} from "react";
import Link from "next/link";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {forgotPasswordSchema, forgotPasswordSchemaType} from "./schema";
import sendPasswordResetLink from "./actions";
import {toast} from "sonner";
import {ArrowLeft} from "lucide-react";
import InlineErrorMessage from "../ui/InlineErrorMessage";

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

    return <section className="flex min-h-[calc(100vh-80px)] w-full max-w-2xl items-center justify-center px-3 py-6 sm:px-6">
        <div className={"flex w-full max-w-5xl items-stretch justify-center rounded-2xl shadow-md overflow-hidden"}>


            <form onSubmit={handleSubmit(onSubmit)}
                  className="flex w-full flex-col items-center justify-center gap-y-5 bg-white px-5 py-8 sm:px-10 lg:px-16">
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
                    {errors.email && submitPressed && (<InlineErrorMessage>
                        {errors.email.message}
                    </InlineErrorMessage>)}
                </div>


                <div className={"w-full flex items-center mt-2 justify-center"}>
                    <button onClick={() => setSubmitPressed(true)} type={"submit"} disabled={isSubmitting}
                            className={`button-primary w-full disabled:opacity-60 ${!isValid ? "opacity-75" : ""}`}>{isSubmitting ?
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
