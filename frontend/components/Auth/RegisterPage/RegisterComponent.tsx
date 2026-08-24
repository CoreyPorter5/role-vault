"use client"

import Link from "next/link";
import registerUser from "./actions";
import React, {useState} from "react";
import {zodResolver} from "@hookform/resolvers/zod";
import {useForm} from "react-hook-form";
import {registerSchema, registerSchemaType} from "./schema";
import {Check} from "lucide-react";
import Image from "next/image";
import googleIcon from "../../../public/google_logo.svg";
import {loginUserWithGoogle} from "../oauth";
import InlineErrorMessage from "../../ui/InlineErrorMessage";
import {RoleVaultLogo} from "../../BrandMark";


export default function RegisterComponent() {


    const [submitPressed, setSubmitPressed] = useState(false);
    const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
    const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false)

    const {
        register,
        handleSubmit,
        formState: {errors, isSubmitting, isValid},
        reset,
        setError,
    } = useForm<registerSchemaType>({resolver: zodResolver(registerSchema), mode: "onChange"})


    const onSubmit = async (data: registerSchemaType) => {
        const response = await registerUser(data);
        if (response.ok) {
            setConfirmationEmail(response.email);
            reset();
            return;
        } else {
            if (response.formError) {
                setError("root", {
                    type: "server",
                    message: response.formError
                })

            } else if (response.fieldErrors) {
                Object.entries(response.fieldErrors).forEach(([fieldName, errorMessage]) => {
                    if (errorMessage) {
                        setError(fieldName as keyof registerSchemaType, {
                            type: "server",
                            message: errorMessage,
                        });
                    }
                });
            }
        }
    }

    const onGoogleSignIn = async () => {
        setIsGoogleSubmitting(true)
        try {
            const result = await loginUserWithGoogle()
            if (!result.ok && result.formError) {
                setError("root", {
                    type: "server",
                    message: result.formError
                })
            }

        }finally {
            setIsGoogleSubmitting(false)
        }

    }

    if (confirmationEmail) {
        return (
            <section
                className="flex min-h-[calc(100vh-4rem)] w-full items-center justify-center bg-white px-3 py-8 sm:px-6">
                {isGoogleSubmitting && (
                    <div className="fixed inset-0 z-[9999] cursor-wait"/>
                )}
                <div className="app-panel w-full max-w-xl p-7 text-center sm:p-10">
                    <span className="eyebrow">One last step</span>
                    <h1 className="mt-3 text-3xl font-semibold">Check your email</h1>
                    <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#666b73]">
                        We sent a confirmation link to <span
                        className="font-semibold text-[#181d26]">{confirmationEmail}</span>.
                        Open it to activate your account, then you will be taken to your dashboard.
                    </p>
                    <Link href="/login" className="button-primary mt-6 inline-flex min-w-40 justify-center">
                        Return to log in
                    </Link>
                </div>
            </section>
        );
    }

    return (
        <section
            className="flex min-h-[calc(100vh-4rem)] w-full items-center justify-center bg-white px-3 py-8 sm:px-6">
            <div
                className="flex w-full max-w-5xl items-stretch justify-center overflow-hidden rounded-xl border border-[#d9d6cf] bg-white shadow-[0_24px_70px_-42px_rgba(37,99,235,0.45)]">
                <div
                    className="relative hidden w-2/5 flex-col items-start justify-start gap-y-6 overflow-hidden bg-[#2563EB] px-9 py-10 text-white md:flex">
                    <div className="absolute -right-14 -top-16 size-48 rounded-full border-[32px] border-white/8"/>
                    <div className="flex items-center gap-2.5">
                        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-white">
                            <RoleVaultLogo size={24}/>
                        </span>
                        <p className="font-display text-xl font-semibold tracking-[-0.04em]">RoleVault</p>
                    </div>
                    <p className="mt-8 max-w-xs text-4xl font-[560] leading-[1.08]">Your job search, finally
                        organised.</p>
                    <div className="mt-4 flex flex-col items-start gap-y-4">
                        <div className={"flex items-center self-start justify-center gap-x-2"}>
                            <Check className={"opacity-60"} height={16} width={16}/>
                            <p className="text-sm font-medium text-white/78">Sync saved jobs from SEEK</p>
                        </div>
                        <div className={"flex items-center self-start justify-center gap-x-2"}>
                            <Check className={"opacity-60"} height={16} width={16}/>
                            <p className="text-sm font-medium text-white/78">Track every active application</p>
                        </div>
                        <div className={"flex items-center self-start justify-center gap-x-2"}>
                            <Check className={"opacity-60"} height={16} width={16}/>
                            <p className="text-sm font-medium text-white/78">Tailor resumes with confidence</p>
                        </div>
                    </div>
                </div>


                <form onSubmit={handleSubmit(onSubmit)}
                      className="flex w-full flex-col items-center justify-center gap-y-4 bg-white px-6 py-9 sm:px-10 md:w-3/5 lg:px-14">
                    <div
                        className={"flex flex-col gap-y-2 md:items-center md:self-center items-start self-start justify-center"}>
                        <span className="eyebrow self-start">Create your workspace</span>
                        <h1 className="self-start text-3xl font-semibold">Start with RoleVault</h1>
                        <p className="text-sm text-[#6c7179]">Start saving jobs, tracking applications, and generating
                            tailored resumes in one workflow.</p>
                    </div>


                    <div className="w-full border-b border-[#e4e1da]"/>

                    {errors.root?.message && (
                        <div className="w-full">
                            <InlineErrorMessage>{errors.root.message}</InlineErrorMessage>
                        </div>
                    )}


                    <div className="flex w-full flex-col items-center justify-between gap-3 sm:flex-row sm:gap-x-4">
                        <div className={"flex w-full items-center flex-col gap-y-1 justify-center"}>
                            <p className={"self-start font-semibold text-sm"}>First Name</p>
                            <input {...register("firstName")}
                                   placeholder={"Jane"}
                                   className="h-11 w-full rounded-lg border border-[#cbc8c0] bg-white px-3.5 text-sm outline-none focus:border-[#2563EB]"
                                   type="text"/>
                        </div>


                        <div className={"flex w-full items-center gap-y-1 flex-col justify-center"}>
                            <p className={"self-start font-semibold text-sm"}>Last Name</p>
                            <input {...register("lastName")}
                                   placeholder={"Doe"}
                                   className="h-11 w-full rounded-lg border border-[#cbc8c0] bg-white px-3.5 text-sm outline-none focus:border-[#2563EB]"
                                   type="text"/>
                        </div>
                    </div>


                    <div className={"flex justify-center gap-y-1 items-start flex-col w-full"}>
                        <p className={"font-semibold text-sm"}>Email Address</p>
                        <input {...register("email")}
                               placeholder={"jane@example.com"}
                               className="h-11 w-full rounded-lg border border-[#cbc8c0] bg-white px-3.5 text-sm outline-none focus:border-[#2563EB]"
                               type="text"/>

                        {errors.email && submitPressed && (<InlineErrorMessage>
                            {errors.email.message}
                        </InlineErrorMessage>)}
                    </div>
                    <div className="flex w-full flex-col items-center justify-between gap-3 sm:flex-row sm:gap-x-4">
                        <div className={"flex justify-center gap-y-1 items-start flex-col w-full"}>
                            <p className={"font-semibold text-sm"}>Password</p>
                            <input {...register("password")}
                                   placeholder={"•••••••••••"}
                                   className="h-11 w-full rounded-lg border border-[#cbc8c0] bg-white px-3.5 text-sm outline-none focus:border-[#2563EB]"
                                   type="password"/>
                            {errors.password && submitPressed && (
                                <InlineErrorMessage>
                                    {errors.password.message}
                                </InlineErrorMessage>)}
                        </div>

                        <div className={"flex justify-center gap-y-1 items-start flex-col w-full"}>
                            <p className={"font-semibold text-sm"}>Confirm Password</p>
                            <input {...register("confirmPassword")}
                                   placeholder={"•••••••••••"}
                                   className="h-11 w-full rounded-lg border border-[#cbc8c0] bg-white px-3.5 text-sm outline-none focus:border-[#2563EB]"
                                   type="password"/>
                            {errors.confirmPassword && submitPressed && (
                                <InlineErrorMessage>
                                    {errors.confirmPassword.message}
                                </InlineErrorMessage>)}
                        </div>

                    </div>


                    <div className={"w-full flex items-center mt-2 justify-center"}>
                        <button onClick={() => setSubmitPressed(true)} type={"submit"}
                                disabled={isSubmitting || !isValid}
                                className={`button-primary w-full disabled:cursor-not-allowed disabled:opacity-60 ${!isValid ? "opacity-75" : ""}`}>{isSubmitting ?
                            <p className={"animate-pulse font-bold text-sm"}>Registering...</p> :
                            <p className={"font-bold text-sm"}>Create account</p>}
                        </button>
                    </div>

                    <div className={"flex items-center gap-x-3 justify-center w-full"}>
                        <div className={`border-dashed flex-1 border-b my-3 border-black/15 `}/>
                        <p className={"font-semibold tem-sm shrink-0 text-black/50"}>or</p>
                        <div className={`border-dashed flex-1 border-b my-3 border-black/15 `}/>
                    </div>

                    <div className={"w-full flex items-center justify-center"}>
                        <button disabled={isSubmitting} onClick={onGoogleSignIn}
                                type={"button"}
                                className="button-secondary w-full">
                            <div className={"flex items-center justify-center gap-x-2"}>
                                <Image src={googleIcon} alt={"Google Logo"} height={16} width={16}/>
                                <p className={"font-bold text-sm"}>Continue with Google</p>
                            </div>

                        </button>
                    </div>

                    <div className={"mt-3"}>
                        <p className="text-sm text-[#666b73]">Already have an account? <Link
                            className="text-sm font-bold text-[#2563EB]" href={"/login"}>Log
                            in</Link></p>

                    </div>


                </form>
            </div>


        </section>

    )
}
