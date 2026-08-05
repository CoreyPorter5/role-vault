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


export default function RegisterComponent() {


    const [submitPressed, setSubmitPressed] = useState(false);

    const {
        register,
        handleSubmit,
        formState: {errors, isSubmitting, isValid},
        reset,
        setError,
    } = useForm<registerSchemaType>({resolver: zodResolver(registerSchema),})


    const onSubmit = async (data: registerSchemaType) => {
        const response = await registerUser(data);
        if (!response.ok) {
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
        <section className={"flex xs:w-4/7 w-5/7 min-h-[calc(100vh-80px)] items-center justify-center px-6"}>
            <div className={"flex w-full max-w-5xl items-stretch justify-center rounded-2xl shadow-md overflow-hidden"}>
                <div className={"hidden md:flex flex-col items-start justify-start gap-y-6 bg-blue-700 py-8 px-8 w-1/3 text-2xl font-bold text-white"}>
                    <p>Your job search, finally organised.</p>
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
                        className={"flex flex-col gap-y-2 md:items-center md:self-center items-start self-start justify-center"}>
                        <h1 className={"text-2xl font-bold self-start"}>Create your SeekSync Account</h1>
                        <p className={`text-black/60 text-sm`}>Start saving jobs, tracking applications, and generating
                            tailored resumes in one workflow.</p>
                    </div>


                    <div className={`border-dashed w-full border-b border-black/15 `}/>


                    <div className={"flex items-center w-full gap-x-4 justify-between"}>
                        <div className={"flex w-full items-center flex-col gap-y-1 justify-center"}>
                            <p className={"self-start font-semibold text-sm"}>First Name</p>
                            <input {...register("firstName")}
                                   placeholder={"Jane"}
                                   className={"outline-none w-full py-2 text-sm pl-3 rounded-md border border-gray-400/30"}
                                   type="text"/>
                        </div>


                        <div className={"flex w-full items-center gap-y-1 flex-col justify-center"}>
                            <p className={"self-start font-semibold text-sm"}>Last Name</p>
                            <input {...register("lastName")}
                                   placeholder={"Doe"}
                                   className={"outline-none w-full py-2 pl-3 text-sm rounded-md border border-gray-400/30"}
                                   type="text"/>
                        </div>
                    </div>


                    <div className={"flex justify-center gap-y-1 items-start flex-col w-full"}>
                        <p className={"font-semibold text-sm"}>Email Address</p>
                        <input {...register("email")}
                               placeholder={"jane@example.com"}
                               className={"outline-none w-full py-2 pl-3 text-sm rounded-md border border-gray-400/30"}
                               type="text"/>

                        {errors.email && submitPressed && (<p className={"text-red-500 font-semibold self-center"}>
                            {errors.email.message}
                        </p>)}
                    </div>
                    <div className={"flex items-center w-full gap-x-4 justify-between"}>
                        <div className={"flex justify-center gap-y-1 items-start flex-col w-full"}>
                            <p className={"font-semibold text-sm"}>Password</p>
                            <input {...register("password")}
                                   placeholder={"•••••••••••"}
                                   className={"outline-none w-full py-2 pl-3 rounded-md border border-gray-400/30"}
                                   type="password"/>
                            {errors.password && submitPressed && (
                                <p className={"text-red-500 font-semibold text-center self-center"}>
                                    {errors.password.message}
                                </p>)}
                        </div>

                        <div className={"flex justify-center gap-y-1 items-start flex-col w-full"}>
                            <p className={"font-semibold text-sm"}>Confirm Password</p>
                            <input {...register("confirmPassword")}
                                   placeholder={"•••••••••••"}
                                   className={"outline-none w-full py-2 pl-3 rounded-md border border-gray-400/30"}
                                   type="password"/>
                            {errors.confirmPassword && submitPressed && (
                                <p className={"text-red-500 font-semibold text-center self-center"}>
                                    {errors.confirmPassword.message}
                                </p>)}
                        </div>

                    </div>


                    <div className={"w-full flex items-center mt-2 justify-center"}>
                        <button onClick={() => setSubmitPressed(true)} type={"submit"} disabled={isSubmitting}
                                className={`${!isValid ? "bg-blue-700/70 hover:cursor-not-allowed" : "hover:cursor-pointer hover:translate-y-0.5 hover:opacity-90  transform duration-150 active:scale-95"} bg-blue-700 text-white py-2 rounded-md w-full`}>{isSubmitting ?
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
                                className={"hover:cursor-pointer hover:translate-y-0.5 hover:opacity-90 border border-black/20  transform duration-150 active:scale-95 bg-gray-500/10 py-2 rounded-md w-full"}>
                            <div className={"flex items-center justify-center gap-x-2"}>
                                <Image src={googleIcon} alt={"Google Logo"} height={16} width={16}/>
                                <p className={"font-bold text-sm"}>Continue with Google</p>
                            </div>

                        </button>
                    </div>

                    <div className={"mt-3"}>
                        <p className={"text-sm"}>Already have an account? <Link className={"font-bold text-sm text-blue-700"} href={"/login"}>Log
                            in</Link></p>

                    </div>


                </form>
            </div>


        </section>

    )
}
