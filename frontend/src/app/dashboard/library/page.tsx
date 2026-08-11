"use client"

import ResumeLibraryComponent from "../../../../components/Library/ResumeLibraryComponent";
import {useState} from "react";
import {Search} from "lucide-react";

export default function LibraryPage() {

    const [currentFilter, setCurrentFilter] = useState<"All" | "Saved Resumes" | "Drafts" | "No Resume">("All")
    const [currentSearchInput, setCurrentSearchInput] = useState<string>("")



    return (
        <main className="flex h-full min-h-0 w-full flex-col px-3 py-5 sm:px-6 lg:px-9 lg:py-8">
            <div className="mb-6 flex shrink-0 flex-col gap-y-1">
                <span className="eyebrow">Documents and drafts</span>
                <h1 className="page-title mt-2">Applications library</h1>
                <p className="mt-1 text-[#6c7179]">Manage and download every tailored application.</p>
            </div>

            <div className="flex flex-col gap-3 pr-0 lg:flex-row lg:items-center lg:justify-between lg:pr-3">
                <div
                    className="app-panel flex min-w-0 flex-1 items-center justify-start gap-x-2 px-4 py-2.5 lg:max-w-1/2">
                    <Search className="text-[#94989e]" size={18}/>
                    <input onChange={(event) => {setCurrentSearchInput(event.target.value)}} value={currentSearchInput}
                           className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-[#9b9da2]"
                           placeholder={"Search by job, company or location..."}/>
                </div>

                <div
                    role="group"
                    aria-label="Filter applications"
                    className="flex max-w-full items-center gap-x-1 overflow-x-auto rounded-lg border border-[#d6d3cb] bg-[#ebe9e4] p-1 text-sm font-semibold text-[#6b7078] sm:gap-x-1">
                    <button type="button" onClick={() => setCurrentFilter("All")}
                         className={`shrink-0 rounded-md px-3 py-1.5 ${currentFilter == "All" && "bg-white text-[#0D3880] shadow-[0_1px_2px_rgba(24,29,38,0.06)]"}`}>
                        All
                    </button>
                    <button type="button" onClick={() => setCurrentFilter("Saved Resumes")}
                         className={`shrink-0 rounded-md px-3 py-1.5 ${currentFilter == "Saved Resumes" && "bg-white text-[#0D3880] shadow-[0_1px_2px_rgba(24,29,38,0.06)]"}`}>
                        Saved Resumes
                    </button>
                    <button type="button" onClick={() => setCurrentFilter("Drafts")}
                         className={`shrink-0 rounded-md px-3 py-1.5 ${currentFilter == "Drafts" && "bg-white text-[#0D3880] shadow-[0_1px_2px_rgba(24,29,38,0.06)]"}`}>
                        Drafts
                    </button>
                    <button type="button" onClick={() => setCurrentFilter("No Resume")}
                         className={`shrink-0 rounded-md px-3 py-1.5 ${currentFilter == "No Resume" && "bg-white text-[#0D3880] shadow-[0_1px_2px_rgba(24,29,38,0.06)]"}`}>
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
