import {Sparkles} from "lucide-react";


export default function Home() {




    return (
        <div className={"flex items-center flex-col gap-x-5 justify-center"}>
            <main className={"flex items-center mt-14 flex-col justify-center"}>
                <div className={"uppercase text-center gap-x-1 flex items-center justify-center text-black/50 font-bold text-sm px-3 py-0.5 bg-blue-200 rounded-full"}>
                    <Sparkles className={"size-4"}/>
                    <p className={"font-extrabold"}>The future of job searching</p>

                </div>
                <h1 className={"text-black text-6xl mt-6 font-extrabold text-center max-w-4/7"}>Master Your Career Flow. <a className={"text-blue-800"}> Sync, Track, and Tailor </a> Every Application.</h1>
                <p className={"text-black/50 font-semibold max-w-3/7 mt-6 text-center"}>The precision curator for modern job seekers. SeekSync transforms the chaotic job search into a high performance pipeline</p>
            </main>

        </div>

    );
}
