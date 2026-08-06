import {ArrowRight, Sparkles} from "lucide-react";
import Link from "next/link";


export default function Home() {


    return (
        <div className="flex flex-col items-center justify-center gap-x-5 px-4">
            <main className="mt-10 flex max-w-6xl flex-col items-center justify-center gap-y-7 sm:mt-14 sm:gap-y-10">
                <div
                    className={"uppercase text-center gap-x-1 flex items-center justify-center text-black/50 font-bold text-sm px-3 py-0.5 bg-blue-200 rounded-full"}>
                    <Sparkles className={"size-4"}/>
                    <p className={"font-extrabold"}>The future of job searching</p>

                </div>
                <h1 className="max-w-5xl text-center text-4xl font-extrabold leading-tight text-black sm:text-5xl lg:text-6xl">Master Your Career
                    Flow. <a className={"text-blue-800"}> Sync, Track, and Tailor </a> Every Application.</h1>
                <p className="max-w-2xl text-center font-semibold text-black/50">The precision curator for modern
                    job seekers. SeekSync transforms the chaotic job search into a high performance pipeline</p>
                <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                    <Link className={"bg-blue-700 hover:translate-y-1 transform duration-100 group flex items-center gap-x-1 text-white font-semibold shadow-md rounded-full px-5 py-3"} href={"/register"}>
                        Get Started
                        <ArrowRight className={"group-hover:translate-x-1 transform duration-100"} height={18}/>
                    </Link>
                    <Link className={"bg-white px-5 py-3 rounded-full font-semibold shadow-md hover:translate-y-1 transform duration-100"} href={"/"}>
                        See How It Works
                    </Link>
                </div>
            </main>

        </div>

    );
}
