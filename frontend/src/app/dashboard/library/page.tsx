import ResumeLibraryComponent from "../../../../components/Library/ResumeLibraryComponent";

export default function LibraryPage(){



    return(
        <main className={"w-full h-full min-h-0 flex flex-col px-10 py-4"}>
            <div className={"shrink-0"}>
                <h1 className={"font-bold text-2xl"}>Resume Library</h1>
                <p className={"text-black/60 font-medium"}>Manage and download your tailored applications</p>
            </div>

            <div className={"flex-1 min-h-0 mt-8"}>
                <ResumeLibraryComponent/>
            </div>

        </main>

    )
}