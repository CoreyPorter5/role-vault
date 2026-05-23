export type JobLibraryItem = {
    jobId: string;
    jobTitle: string;
    companyLogo: string | null;
    companyName: string;
    location: string;
    dateSynced: string;
    jobStatus: string;
    resume: GeneratedResume;
};

export type GeneratedResume = {
    exists: boolean;
    originalFilename?: string;
    storagePath?: string;
    updatedAt?: string;
};


export type JobLibraryItemDraft = {
    draftId: string;
    jobId: string;
    jobTitle: string;
    companyLogo: string | null;
    companyName: string;
    location: string;
    dateSynced: string;
    jobStatus: string;
    createdAt: string;
    updatedAt: string;
    expiresAt: string;

}