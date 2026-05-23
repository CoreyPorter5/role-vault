"use client"

import ResumeLibraryComponent from "../../../../components/Library/ResumeLibraryComponent";
import {useState} from "react";
import {Search} from "lucide-react";

export default function LibraryPage() {

    const [currentFilter, setCurrentFilter] = useState<"All" | "Generated" | "Not Generated" | "Drafts">("All")
    const [currentSearchInput, setCurrentSearchInput] = useState<string>("")



    return (
        <main className={"w-full h-full min-h-0 flex flex-col px-10 py-5"}>
            <div className={"shrink-0 flex flex-col mb-5 gap-y-1"}>
                <h1 className={"font-bold text-3xl"}>Applications Library</h1>
                <p className={"text-black/60 font-medium"}>Manage and download your tailored applications</p>
            </div>

            <div className={"flex justify-between items-center pr-3"}>
                <div
                    className={"flex min-w-0 flex-1 max-w-1/2 items-center gap-x-2 bg-white rounded-md shadow-sm px-5 py-2 justify-start"}>
                    <Search className={"opacity-25"} size={"20"}/>
                    <input onChange={(event) => {setCurrentSearchInput(event.target.value)}} value={currentSearchInput}
                           className={"outline-none w-full font-semibold placeholder-black/25"}
                           placeholder={"Search by job, company or location..."}/>
                </div>

                <div
                    className={"bg-gray-300/40 rounded-lg font-bold text-black/60 text-sm border border-gray-300/70 flex items-center justify-center gap-x-5 py-1.5 px-2"}>
                    <div onClick={() => setCurrentFilter("All")}
                         className={`px-3 py-1 hover:cursor-pointer rounded-md ${currentFilter == "All" && "bg-white text-blue-700"}`}>
                        All
                    </div>
                    <div onClick={() => setCurrentFilter("Generated")}
                         className={`px-3 py-1 hover:cursor-pointer rounded-md ${currentFilter == "Generated" && "bg-white text-blue-700"}`}>
                        Generated
                    </div>
                    <div onClick={() => setCurrentFilter("Not Generated")}
                         className={`px-3 py-1 hover:cursor-pointer rounded-md ${currentFilter == "Not Generated" && "bg-white text-blue-700"}`}>
                        Not Generated
                    </div>
                    <div onClick={() => setCurrentFilter("Drafts")}
                         className={`px-3 py-1 hover:cursor-pointer rounded-md ${currentFilter == "Drafts" && "bg-white text-blue-700"}`}>
                        Drafts
                    </div>

                </div>
            </div>

            <div className={"flex-1 min-h-0 mt-6"}>
                <ResumeLibraryComponent searchInput={currentSearchInput} filter={currentFilter}/>
            </div>

        </main>

    )
}