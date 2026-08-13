import type {Job} from "@/lib/types/types";

export type PipelineCardFooter = "saved-actions" | "view-documents" | null;

export function getPipelineCardFooter(
    status: Job["jobStatus"],
    hasDocuments: boolean,
): PipelineCardFooter {
    if (status === "Saved") {
        return "saved-actions";
    }
    if ((status === "Applied" || status === "Interviewing") && hasDocuments) {
        return "view-documents";
    }
    return null;
}
