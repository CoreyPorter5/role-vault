import ResumeEditorWrapper from "../../../../components/Resume/ResumeEditorWrapper";


export default function ResumePage(){



    return (
        <main className="flex h-full min-h-0 flex-col gap-y-8 overflow-hidden px-3 pb-10 pt-5 sm:px-6 lg:px-9 lg:pt-8">
            <div className={"flex shrink-0 flex-col gap-y-2"}>
                <span className="eyebrow">Source document</span>
                <h1 className="page-title mt-1">Master resume</h1>
                <p className="text-[#6c7179]">Review and edit the source resume used to generate tailored applications.</p>
            </div>
            <ResumeEditorWrapper/>


        </main>
    )
}
