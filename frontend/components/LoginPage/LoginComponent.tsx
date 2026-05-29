"use client"

import Link from "next/link";
import React, {useState} from "react";
import {type loginSchemaType, loginSchema} from "./schema";
import {zodResolver} from "@hookform/resolvers/zod";
import {useForm} from "react-hook-form";
import loginUser from "./actions";
import {Check} from "lucide-react";


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


    return (
        <section className={"flex xs:w-4/7 w-5/7 min-h-[calc(100vh-80px)] items-center justify-center px-6"}>
            <div className={"flex w-full max-w-5xl items-stretch justify-center rounded-2xl shadow-md overflow-hidden"}>
                <div
                    className={"hidden md:flex flex-col items-start justify-start gap-y-6 bg-blue-700 py-8 px-8 w-1/3 font-bold text-white"}>
                    <p className={"font-extrabold text-xl tracking-tighter"}>SeekSync</p>
                    <p className={"font-extrabold text-2xl"}>Welcome back to SeekSync.</p>
                    <div className={"flex self-start flex-col gap-y-4 items-center justify-center"}>
                        <div className={"flex items-center self-start justify-center gap-x-2"}>
                            <Check className={"opacity-60"} height={16} width={16}/>
                            <p className={"text-xs font-medium"}>Sync saved jobs from SEEK</p>
                        </div>
                        <div className={"flex items-center self-start justify-center gap-x-2"}>
                            <Check className={"opacity-60"} height={16} width={16}/>
                            <p className={"text-xs font-medium"}>Track applications in your dashboard</p>
                        </div>
                        <div className={"flex items-center self-start justify-center gap-x-2"}>
                            <Check className={"opacity-60"} height={16} width={16}/>
                            <p className={"text-xs font-medium"}>3 tailored resumes per month</p>
                        </div>
                        <div className={"flex items-center self-start justify-center gap-x-2"}>
                            <Check className={"opacity-60"} height={16} width={16}/>
                            <p className={"text-xs font-medium"}>Basic application library</p>
                        </div>
                        <div className={"flex items-center self-start justify-center gap-x-2"}>
                            <Check className={"opacity-60"} height={16} width={16}/>
                            <p className={"text-xs font-medium"}>Manual resume management</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit(onSubmit)}
                      className={"w-full md:w-2/3 bg-white px-16 py-8 gap-y-3 flex flex-col items-center justify-center"}>
                    <div
                        className={"flex flex-col gap-y-2 md:items-center items-start self-start justify-center"}>
                        <h1 className={"text-2xl font-bold self-start"}>Log in to your Account</h1>
                        <p className={`text-black/60 text-sm`}>Access your saved jobs, resumes, and application pipeline</p>
                    </div>




                    <div className={`border-dashed w-full border-b border-black/15 `}/>


                    <div className={"flex justify-center gap-y-1 items-start flex-col w-full"}>
                        <p className={"font-semibold text-sm"}>Email Address</p>
                        <input {...register("email")}
                               placeholder={"you@example.com"}
                               className={"outline-none w-full py-2 pl-3 text-sm rounded-md border border-gray-400/30"}
                               type="text"/>
                        {errors.email && submitPressed && (<p className={"text-red-500 text-center font-semibold text-sm self-start"}>
                            {errors.email.message}
                        </p>)}
                    </div>


                    <div className={" flex justify-center gap-y-1 items-start flex-col w-full"}>
                        <p className={"font-semibold text-sm"}>Password</p>
                        <input {...register("password")}
                               placeholder={"•••••••••••"}
                               className={"outline-none w-full py-2 pl-3 text-sm rounded-md border border-gray-400/30"}
                               type="password"/>
                        {errors.password && submitPressed && (<p className={"text-red-500 text-center font-semibold text-sm self-start"}>
                            {errors.password.message}
                        </p>)}
                        <Link href={"/forgot-password"} className={"self-end text-sm text-blue-700 font-semibold"}>Forgot password?</Link>
                    </div>






                    <div className={"w-full flex items-center mt-2 justify-center"}>
                        <button onClick={() => setSubmitPressed(true)} type={"submit"} disabled={isSubmitting}
                                className={`${!isValid ? "bg-blue-700/60 hover:cursor-not-allowed" : "hover:cursor-pointer hover:translate-y-0.5 hover:opacity-60 transform duration-150 active:scale-95"} bg-blue-700 text-white py-2 rounded-md w-full`}>{isSubmitting ?
                            <p className={"animate-pulse font-bold text-sm"}>Logging in...</p> : <p className={"font-bold text-sm"}>Log in</p>}
                        </button>
                    </div>

                    <div className={`border-dashed w-full border-b my-3 border-black/15 `}/>

                    <div className={"w-full flex items-center justify-center"}>
                        <button type={"submit"} disabled={isSubmitting}
                                className={"hover:cursor-pointer hover:translate-y-0.5 hover:opacity-90 border border-black/20  transform duration-150 active:scale-95 bg-gray-500/10 py-2 rounded-md w-full"}>
                            <p className={"font-bold text-sm"}>Continue with Google</p>
                        </button>
                    </div>


                    <div className={"mt-3"}>
                        <p className={"text-sm"}>Don&#39;t have an account? <Link className={"font-bold text-blue-700 text-sm"} href={"/register"}>Sign up</Link>
                        </p>
                    </div>


                </form>


            </div>


        </section>

    )
}