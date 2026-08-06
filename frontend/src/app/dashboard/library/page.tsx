"use client"

import ResumeLibraryComponent from "../../../../components/Library/ResumeLibraryComponent";
import {useState} from "react";
import {Search} from "lucide-react";

export default function LibraryPage() {

    const [currentFilter, setCurrentFilter] = useState<"All" | "Saved Resumes" | "Drafts" | "No Resume">("All")
    const [currentSearchInput, setCurrentSearchInput] = useState<string>("")



    return (
        <main className="flex h-full min-h-0 w-full flex-col px-3 py-5 sm:px-6 lg:px-10">
            <div className={"shrink-0 flex flex-col mb-5 gap-y-1"}>
                <h1 className={"font-bold text-3xl"}>Applications Library</h1>
                <p className={"text-black/60 font-medium"}>Manage and download your tailored applications</p>
            </div>

            <div className="flex flex-col gap-3 pr-0 lg:flex-row lg:items-center lg:justify-between lg:pr-3">
                <div
                    className="flex min-w-0 flex-1 items-center justify-start gap-x-2 rounded-md bg-white px-5 py-2 shadow-sm lg:max-w-1/2">
                    <Search className={"opacity-25"} size={"20"}/>
                    <input onChange={(event) => {setCurrentSearchInput(event.target.value)}} value={currentSearchInput}
                           className={"outline-none w-full font-semibold placeholder-black/25"}
                           placeholder={"Search by job, company or location..."}/>
                </div>

                <div
                    role="group"
                    aria-label="Filter applications"
                    className="flex max-w-full items-center gap-x-1 overflow-x-auto rounded-lg border border-gray-300/70 bg-gray-300/40 p-1.5 text-sm font-bold text-black/60 sm:gap-x-2">
                    <button type="button" onClick={() => setCurrentFilter("All")}
                         className={`shrink-0 rounded-md px-3 py-1 ${currentFilter == "All" && "bg-white text-blue-700"}`}>
                        All
                    </button>
                    <button type="button" onClick={() => setCurrentFilter("Saved Resumes")}
                         className={`shrink-0 rounded-md px-3 py-1 ${currentFilter == "Saved Resumes" && "bg-white text-blue-700"}`}>
                        Saved Resumes
                    </button>
                    <button type="button" onClick={() => setCurrentFilter("Drafts")}
                         className={`shrink-0 rounded-md px-3 py-1 ${currentFilter == "Drafts" && "bg-white text-blue-700"}`}>
                        Drafts
                    </button>
                    <button type="button" onClick={() => setCurrentFilter("No Resume")}
                         className={`shrink-0 rounded-md px-3 py-1 ${currentFilter == "No Resume" && "bg-white text-blue-700"}`}>
                        No Resume
                    </button>

                </div>
            </div>

            <div className={"flex-1 min-h-0 mt-6"}>
                <ResumeLibraryComponent searchInput={currentSearchInput} filter={currentFilter}/>
            </div>

        </main>

    )
}
