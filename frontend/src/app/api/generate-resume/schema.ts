import {technologyProductDataResumeSchema} from "@/lib/resume-generation/profiles/technology";

// Backwards-compatible export for the editor while all six v1 profiles share
// the original schema. Category-aware server paths resolve their schema from
// the profile registry instead.
export const tailoredResumeSchema = technologyProductDataResumeSchema;

export type {TailoredResume} from "@/lib/resume-generation/profiles/base-schema";
