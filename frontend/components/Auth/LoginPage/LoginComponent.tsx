"use client"

import Link from "next/link";
import React, {useState} from "react";
import {type loginSchemaType, loginSchema} from "./schema";
import {zodResolver} from "@hookform/resolvers/zod";
import {useForm} from "react-hook-form";
import loginUser from "./actions";
import {Check} from "lucide-react";
import googleIcon from "../../../public/google_logo.svg"
import Image from "next/image"
import {loginUserWithGoogle} from "../oauth";
import InlineErrorMessage from "../../ui/InlineErrorMessage";


export default function LoginForm() {


    const [submitPressed, setSubmitPressed] = useState(false);

    const {
        register,
        handleSubmit,
        formState: {errors, isSubmitting, isValid},
        reset,
        setError,
    } = useForm<loginSchemaType>({resolver: zodResolver(loginSchema),})


    const onSubmit = async (data: loginSchemaType) => {
        const response = await loginUser(data);
        if (!response.ok) {
            if (response.formError) {
                setError("root", {
                    type: "server",
                    message: response.formError
                })

            } else if (response.fieldErrors) {
                const errors = response.fieldErrors
                if (errors.email) {
                    setError("email",
                        {
                            type: "server",
                            message: errors.email
                        })
                } else if (errors.password) {
                    setError("password",
                        {
                            type: "server",
                            message: errors.password
                        })
                } else {
                    alert("Something went wrong")
                }
            }

            return
        }

        reset();
    }

    const onGoogleSignIn = async() => {
        const result = await loginUserWithGoogle()
        if(!result.ok && result.formError){
            setError("root", {
                type: "server",
                message: result.formError
            })
        }
    }


    return (
        <section className="flex min-h-[calc(100vh-4rem)] w-full items-center justify-center bg-[#f5f4f0] px-3 py-8 sm:px-6">
            <div className="flex w-full max-w-5xl items-stretch justify-center overflow-hidden rounded-xl border border-[#d9d6cf] bg-white shadow-[0_24px_70px_-42px_rgba(13,56,128,0.45)]">
                <div
                    className="relative hidden w-2/5 flex-col items-start justify-start gap-y-6 overflow-hidden bg-[#0D3880] px-9 py-10 text-white md:flex">
                    <div className="absolute -right-14 -top-16 size-48 rounded-full border-[32px] border-white/8"/>
                    <p className="font-display text-xl font-semibold tracking-[-0.04em]">RoleVault</p>
                    <p className="mt-8 max-w-xs text-4xl font-[560] leading-[1.08]">Pick up exactly where your search left off.</p>
                    <div className="mt-4 flex flex-col items-start gap-y-4">
                        <div className={"flex items-center self-start justify-center gap-x-2"}>
                            <Check className="opacity-75" height={16} width={16}/>
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
                      className="flex w-full flex-col items-center justify-center gap-y-4 bg-white px-6 py-9 sm:px-10 md:w-3/5 lg:px-16">
                    <div
                        className={"flex flex-col gap-y-2 md:items-center items-start self-start justify-center"}>
                        <span className="eyebrow">Welcome back</span>
                        <h1 className="self-start text-3xl font-semibold">Log in to RoleVault</h1>
                        <p className="text-sm text-[#6c7179]">Access your jobs, resumes and application pipeline.</p>
                    </div>




                    <div className="w-full border-b border-[#e4e1da]"/>

                    {errors.root?.message && (
                        <div className="w-full">
                            <InlineErrorMessage>{errors.root.message}</InlineErrorMessage>
                        </div>
                    )}


                    <div className={"flex justify-center gap-y-1 items-start flex-col w-full"}>
                        <p className={"font-semibold text-sm"}>Email Address</p>
                        <input {...register("email")}
                               placeholder={"you@example.com"}
                               className="h-11 w-full rounded-lg border border-[#cbc8c0] bg-white px-3.5 text-sm outline-none focus:border-[#0D3880]"
                               type="text"/>
                        {errors.email && submitPressed && (<InlineErrorMessage>
                            {errors.email.message}
                        </InlineErrorMessage>)}
                    </div>


                    <div className={" flex justify-center gap-y-1 items-start flex-col w-full"}>
                        <p className={"font-semibold text-sm"}>Password</p>
                        <input {...register("password")}
                               placeholder={"•••••••••••"}
                               className="h-11 w-full rounded-lg border border-[#cbc8c0] bg-white px-3.5 text-sm outline-none focus:border-[#0D3880]"
                               type="password"/>
                        {errors.password && submitPressed && (<InlineErrorMessage>
                            {errors.password.message}
                        </InlineErrorMessage>)}
                        <Link href={"/forgot-password"} className="self-end text-sm font-semibold text-[#0D3880]">Forgot password?</Link>
                    </div>






                    <div className={"w-full flex items-center mt-2 justify-center"}>
                        <button onClick={() => setSubmitPressed(true)} type={"submit"} disabled={isSubmitting}
                                className={`button-primary w-full disabled:opacity-60 ${!isValid ? "opacity-75" : ""}`}>{isSubmitting ?
                            <p className={"animate-pulse font-bold text-sm"}>Logging in...</p> : <p className={"font-bold text-sm"}>Log in</p>}
                        </button>
                    </div>
                    <div className={"flex items-center gap-x-3 justify-center w-full"}>
                        <div className={`border-dashed flex-1 border-b my-3 border-black/15 `}/>
                        <p className={"font-semibold tem-sm shrink-0 text-black/50"}>or</p>
                        <div className={`border-dashed flex-1 border-b my-3 border-black/15 `}/>
                    </div>

                    <div className={"w-full flex items-center justify-center"}>
                        <button type={"button"} disabled={isSubmitting}
                                onClick={onGoogleSignIn}
                                className="button-secondary w-full">
                            <div className={"flex items-center justify-center gap-x-2"}>
                                <Image src={googleIcon} alt={"Google Logo"} height={16} width={16}/>
                                <p className={"font-bold text-sm"}>Continue with Google</p>
                            </div>

                        </button>
                    </div>


                    <div className={"mt-3"}>
                        <p className="text-sm text-[#666b73]">Don&#39;t have an account? <Link className="text-sm font-bold text-[#0D3880]" href={"/register"}>Sign up</Link>
                        </p>
                    </div>


                </form>


            </div>


        </section>

    )
}
