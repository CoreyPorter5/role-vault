import ResumeEditorWrapper from "../../../../components/Resume/ResumeEditorWrapper";


export default function ResumePage(){



    return (
        <main className={"px-10 pt-5 pb-10 overflow-hidden gap-y-8 flex flex-col h-screen min-h-0"}>
            <div className={"flex shrink-0 flex-col gap-y-2"}>
                <h1 className={"text-3xl font-bold"}>Master Resume</h1>
                <p>Review and edit the source resume used to generate your tailored applications</p>
            </div>
            <ResumeEditorWrapper/>


        </main>
    )
}