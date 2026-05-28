"use client"

import Link from "next/link";
import registerUser from "./actions";
import React, {useState} from "react";
import {zodResolver} from "@hookform/resolvers/zod";
import {useForm} from "react-hook-form";
import {registerSchema, registerSchemaType} from "./schema";


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


    return (
        <section className={"flex w-4/7 min-h-[calc(100vh-80px)] items-center justify-center px-6"}>
            <div className={"flex w-full max-w-5xl items-stretch justify-center rounded-2xl shadow-md overflow-hidden"}>
                <div className={"hidden md:flex bg-blue-700 py-8 px-8 w-1/3 text-2xl font-bold text-white"}>
                    Your job search, finally organised.
                </div>
                <form onSubmit={handleSubmit(onSubmit)}
                      className={"w-full md:w-2/3 bg-white px-8 py-8 gap-y-2 flex flex-col items-center justify-center"}>
                    <div
                        className={"flex flex-col gap-y-2 md:items-center md:self-center items-start self-start justify-center"}>
                        <h1 className={"text-2xl font-bold"}>Create your SeekSync Account</h1>
                        <p className={`text-black/60 text-sm`}>Create an account to get started!</p>
                    </div>


                    <div className={`border-dashed w-full border-b border-black/15 `}/>


                    <div className={"flex items-center w-full gap-x-4 justify-between"}>
                        <div className={"flex w-full items-center flex-col justify-center"}>
                            <p className={"self-start font-medium text-sm"}>First Name</p>
                            <input {...register("firstName")}
                                   className={"outline-none w-full py-2 text-sm pl-1 rounded-md border border-gray-400/30"}
                                   type="text"/>
                        </div>


                        <div className={"flex w-full items-center gap-y-2 flex-col justify-center"}>
                            <p className={"self-start"}>Last Name</p>
                            <input {...register("lastName")}
                                   className={"outline-none w-full py-1 pl-1 rounded-md border border-gray-400/30"}
                                   type="text"/>
                        </div>
                    </div>


                    <div className={" flex justify-center gap-y-2 items-start flex-col w-full"}>
                        <p>Email</p>
                        <input {...register("email")}
                               className={"outline-none w-full py-1 pl-1 rounded-md border border-gray-400/30"}
                               type="text"/>

                        {errors.email && submitPressed && (<p className={"text-red-500 font-medium self-center"}>
                            {errors.email.message}
                        </p>)}
                    </div>


                    <div className={"flex justify-center gap-y-2 items-start flex-col w-full"}>
                        <p>Password</p>
                        <input {...register("password")}
                               className={"outline-none w-full py-1 pl-1 rounded-md border border-gray-400/30"}
                               type="password"/>
                        {errors.password && submitPressed && (
                            <p className={"text-red-500 font-medium text-center self-center"}>
                                {errors.password.message}
                            </p>)}
                    </div>

                    <div className={" flex justify-center gap-y-2 items-start flex-col w-full"}>
                        <p>Confirm Password</p>
                        <input {...register("confirmPassword")}
                               className={"outline-none w-full py-1 pl-1 rounded-md border border-gray-400/30"}
                               type="password"/>
                        {errors.confirmPassword && submitPressed && (
                            <p className={"text-red-500 font-medium text-center self-center"}>
                                {errors.confirmPassword.message}
                            </p>)}
                    </div>


                    <div className={"w-full flex items-center justify-center"}>
                        <button onClick={() => setSubmitPressed(true)} type={"submit"} disabled={isSubmitting}
                                className={`${!isValid ? "bg-blue-700/70 hover:cursor-not-allowed" : "hover:cursor-pointer hover:translate-y-0.5 hover:opacity-90 transform duration-150 active:scale-95"} bg-blue-700 text-white  py-3 rounded-md w-full`}>{isSubmitting ?
                            <p className={"animate-pulse font-bold"}>Registering...</p> :
                            <p className={"font-bold"}>Create account</p>}
                        </button>
                    </div>

                    <div className={"mt-3"}>
                        <p>Already have an account? <Link className={"font-bold text-blue-700"} href={"/login"}>Log
                            in</Link></p>

                    </div>


                </form>
            </div>


        </section>

    )
}
