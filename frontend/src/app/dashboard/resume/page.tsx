import ResumeEditorWrapper from "../../../../components/Resume/ResumeEditorWrapper";


export default function ResumePage(){



    return (
        <main className="flex h-full min-h-0 flex-col gap-y-8 overflow-hidden px-3 pb-10 pt-5 sm:px-6 lg:px-10">
            <div className={"flex shrink-0 flex-col gap-y-2"}>
                <h1 className={"text-3xl font-bold"}>Master Resume</h1>
                <p>Review and edit the source resume used to generate your tailored applications</p>
            </div>
            <ResumeEditorWrapper/>


        </main>
    )
}
