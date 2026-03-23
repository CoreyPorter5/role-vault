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
                Object.keys(response.fieldErrors).forEach(([fieldName, errorMessage]) => {
                    if(errorMessage){
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
        <form onSubmit={handleSubmit(onSubmit)}
              className={"px-8 max-w-lg py-5 mt-10 w-full gap-y-5 flex flex-col items-center justify-center border-gray-400/50 self-center"}>
            <div
                className={"flex flex-col gap-y-2 md:items-center md:self-center items-start self-start justify-center"}>
                <h1 className={"text-xl font-medium"}>Create an Account</h1>
                <p className={`text-black/60 dark:text-white/60 text-sm`}>Create an account to get started!</p>
            </div>


            <div className={`border-dashed w-full border-b border-black/15 dark:border-white/15`}/>


            <div className={"flex items-center w-full gap-x-2 justify-between"}>
                <div className={"flex items-center gap-y-2 flex-col justify-center"}>
                    <p className={"self-start"}>First Name</p>
                    <input {...register("firstName")}
                           className={"outline-none py-1 pl-1 rounded-md border border-gray-400/30"}
                           type="text"/>
                </div>


                <div className={"flex items-center gap-y-2 flex-col justify-center"}>
                    <p className={"self-start"}>Last Name</p>
                    <input {...register("lastName")}
                           className={"outline-none py-1 pl-1 rounded-md border border-gray-400/30"}
                           type="text"/>
                </div>
            </div>


            <div className={" flex justify-center gap-y-2 items-start flex-col w-full"}>
                <p>Email</p>
                <input {...register("email")}
                       className={"outline-none w-full py-1 pl-1 rounded-md border border-gray-400/30"}
                       type="text"/>

                {errors.email && submitPressed && (<p className={"text-red-500 self-center"}>
                    {errors.email.message}
                </p>)}
            </div>


            <div className={"flex justify-center gap-y-2 items-start flex-col w-full"}>
                <p>Password</p>
                <input {...register("password")}
                       className={"outline-none w-full py-1 pl-1 rounded-md border border-gray-400/30"}
                       type="password"/>
                {errors.password && submitPressed && (<p className={"text-red-500 text-center self-center"}>
                    {errors.password.message}
                </p>)}
            </div>

            <div className={" flex justify-center gap-y-2 items-start flex-col w-full"}>
                <p>Confirm Password</p>
                <input {...register("confirmPassword")}
                       className={"outline-none w-full py-1 pl-1 rounded-md border border-gray-400/30"}
                       type="password"/>
                {errors.confirmPassword && submitPressed && (<p className={"text-red-500 text-center self-center"}>
                    {errors.confirmPassword.message}
                </p>)}
            </div>


            <div className={"w-full flex items-center justify-center"}>
                <button onClick={() => setSubmitPressed(true)} type={"submit"} disabled={isSubmitting}
                        className={`${!isValid ? "bg-black/50 hover:cursor-not-allowed" : "hover:cursor-pointer hover:translate-y-0.5 hover:opacity-90 transform duration-150 active:scale-95"} bg-black text-white dark:bg-white dark:text-black py-3 rounded-md w-full`}>{isSubmitting ?
                    <p className={"animate-pulse"}>Registering...</p> : <p>Register</p>}
                </button>
            </div>

            <div className={"mt-3"}>
                <p>Already have an account? <Link className={"font-bold"} href={"/login"}>Log
                    in</Link></p>

            </div>


        </form>
    )
}