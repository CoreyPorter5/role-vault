"use client"

import Link from "next/link";
import React, {useState} from "react";
import {type loginSchemaType, loginSchema} from "./schema";
import {zodResolver} from "@hookform/resolvers/zod";
import {useForm} from "react-hook-form";
import loginUser from "./actions";


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
        <form onSubmit={handleSubmit(onSubmit)}
              className={"px-8 max-w-lg py-5 mt-10 w-full gap-y-5 flex flex-col items-center justify-center border-gray-400/50 self-center"}>
            <div
                className={"flex flex-col gap-y-2 md:items-center md:self-center items-start self-start justify-center"}>
                <h1 className={"text-xl font-medium "}>Log in to your Account</h1>
            </div>


            <div className={`border-dashed w-full border-b border-black/15 dark:border-white/15`}/>


            <div className={"flex justify-center gap-y-2 items-start flex-col w-full"}>
                <p>Email</p>
                <input {...register("email")}
                       className={"outline-none w-full py-1 pl-1 rounded-md border border-gray-400/30"}
                       type="text"/>

            </div>


            <div className={" flex justify-center gap-y-2 items-start flex-col w-full"}>
                <p>Password</p>
                <input {...register("password")}
                       className={"outline-none w-full py-1 pl-1 rounded-md border border-gray-400/30"}
                       type="password"/>
                {errors.password && submitPressed && (<p className={"text-red-500 text-center self-center"}>
                    {errors.password.message}
                </p>)}
            </div>

            {errors.email && submitPressed && (<p className={"text-red-500 self-center"}>
                {errors.email.message}
            </p>)}


            <div className={"w-full flex items-center justify-center"}>
                <button onClick={() => setSubmitPressed(true)} type={"submit"} disabled={isSubmitting}
                        className={`${!isValid ? "bg-black/50 hover:cursor-not-allowed" : "hover:cursor-pointer hover:translate-y-0.5 hover:opacity-60 transform duration-150 active:scale-95"} bg-black text-white dark:bg-white dark:text-black  py-3 rounded-md w-full`}>{isSubmitting ?
                    <p className={"animate-pulse"}>Logging in...</p> : <p>Login</p>}
                </button>
            </div>

            <div className={"mt-3"}>
                <p>Don&#39;t have an account? <Link className={"font-bold"} href={"/register"}>Sign up</Link></p>
            </div>


        </form>
    )
}