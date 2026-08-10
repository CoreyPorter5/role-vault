import type {Job} from "@/lib/types/types";
import type {ResumeCategory} from "@/lib/resume-generation/categories";

export type JobLibraryItem = {
    jobId: string;
    jobTitle: string;
    companyLogo: string | null;
    companyName: string;
    location: string;
    dateSynced: string;
    jobStatus: Job["jobStatus"];
    resume: GeneratedResume;
};

export type GeneratedResume = {
    exists: boolean;
    originalFilename?: string;
    storagePath?: string;
    updatedAt?: string;
    resumeCategory?: ResumeCategory;
    profileVersion?: number;
    templateVersion?: string;
};


export type JobLibraryItemDraft = {
    draftId: string;
    jobId: string;
    jobTitle: string;
    companyLogo: string | null;
    companyName: string;
    location: string;
    dateSynced: string;
    jobStatus: Job["jobStatus"];
    draftCreatedAt: string;
    draftUpdatedAt: string;
    draftExpiresAt: string;
    resumeCategory: ResumeCategory;
    profileVersion: number;
    templateVersion: string;

}
