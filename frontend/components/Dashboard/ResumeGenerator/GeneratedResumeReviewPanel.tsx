"use client";

import {Download, LoaderCircle, Save, X} from "lucide-react";
import type {TailoredResume} from "@/app/api/generate-resume/schema";
import type {Job} from "@/lib/types/types";
import type {JobLibraryItem} from "../../Library/schema";
import type {ResumeCategory} from "@/lib/resume-generation/categories";
import {resumeEditorLimits, resumeProjectPresentation} from "@/lib/resume-generation/categories";

export type ResumeReviewAction = "download" | "save" | null;

type Props = {
    job: Job | JobLibraryItem;
    resume: TailoredResume;
    categoryLabel: string;
    resumeCategory: ResumeCategory;
    action: ResumeReviewAction;
    documentSwitchLocked: boolean;
    onChange: (resume: TailoredResume) => void;
    onClose: () => void;
    onSelectCoverLetter: () => void;
    onDownload: () => void;
    onSave: () => void;
    onStartAnother: () => void;
};

export default function GeneratedResumeReviewPanel({
    job,
    resume,
    categoryLabel,
    resumeCategory,
    action,
    documentSwitchLocked,
    onChange,
    onClose,
    onSelectCoverLetter,
    onDownload,
    onSave,
    onStartAnother,
}: Props) {
    const busy = action !== null;
    const editorLimits = resumeEditorLimits[resumeCategory];
    const projectPresentation = resumeProjectPresentation[resumeCategory];

    return (
        <div className="flex flex-col gap-5" aria-busy={busy}>
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="eyebrow">Application studio</p>
                    <h2 className="mt-1 text-2xl font-semibold">Create your documents</h2>
                </div>
                <button
                    type="button"
                    disabled={busy}
                    onClick={onClose}
                    className="rounded-lg p-2 text-[#6f747c] hover:bg-[#f5f4f0] hover:text-[#181d26] disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Close"
                >
                    <X className="size-5"/>
                </button>
            </div>

            <div
                className="flex w-fit rounded-lg border border-[#d9d6ce] bg-[#f5f4f0] p-1"
                role="tablist"
                aria-label="Application document"
            >
                <button
                    type="button"
                    role="tab"
                    aria-selected="true"
                    className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-[#2563EB] shadow-sm hover:bg-[#faf9f6]"
                >
                    Resume
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected="false"
                    disabled={documentSwitchLocked}
                    onClick={onSelectCoverLetter}
                    title={documentSwitchLocked ? "Finish the current action before switching documents" : undefined}
                    className="rounded-md px-4 py-2 text-sm font-semibold text-[#555b64] hover:bg-white disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent"
                >
                    Cover letter
                </button>
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
                <div className="app-panel space-y-6 p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <p className="eyebrow">Resume draft</p>
                            <h3 className="mt-1 font-semibold">{job.jobTitle} at {job.companyName}</h3>
                        </div>
                        <span className="rounded-md bg-[#EFF6FF] px-2.5 py-1 text-xs font-semibold text-[#2563EB]">
                            {categoryLabel}
                        </span>
                    </div>

                    <fieldset disabled={busy} className="space-y-6 disabled:opacity-70">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <EditableLine
                                label="Name"
                                value={resume.fullName}
                                maxLength={80}
                                onChange={(fullName) => onChange({...resume, fullName})}
                            />
                            <EditableLine
                                label="Professional title"
                                value={resume.professionalTitle}
                                maxLength={80}
                                onChange={(professionalTitle) => onChange({...resume, professionalTitle})}
                            />
                        </div>

                        <div>
                            <SectionLabel>Contact</SectionLabel>
                            <div className="mt-3 grid gap-4 sm:grid-cols-2">
                                <EditableNullableLine
                                    label="Location"
                                    value={resume.contact.location}
                                    maxLength={80}
                                    onChange={(location) => onChange({...resume, contact: {...resume.contact, location}})}
                                />
                                <EditableNullableLine
                                    label="Phone"
                                    value={resume.contact.phone}
                                    maxLength={40}
                                    onChange={(phone) => onChange({...resume, contact: {...resume.contact, phone}})}
                                />
                                <EditableNullableLine
                                    label="Email"
                                    value={resume.contact.email}
                                    maxLength={120}
                                    onChange={(email) => onChange({...resume, contact: {...resume.contact, email}})}
                                />
                                <EditableNullableLine
                                    label="LinkedIn"
                                    value={resume.contact.linkedin}
                                    maxLength={120}
                                    onChange={(linkedin) => onChange({...resume, contact: {...resume.contact, linkedin}})}
                                />
                                <EditableNullableLine
                                    label="GitHub"
                                    value={resume.contact.github}
                                    maxLength={120}
                                    onChange={(github) => onChange({...resume, contact: {...resume.contact, github}})}
                                />
                                <EditableNullableLine
                                    label="Portfolio"
                                    value={resume.contact.portfolioSite}
                                    maxLength={120}
                                    onChange={(portfolioSite) => onChange({...resume, contact: {...resume.contact, portfolioSite}})}
                                />
                            </div>
                        </div>

                        <EditableParagraph
                            label="Professional summary"
                            value={resume.professionalSummary}
                            maxLength={editorLimits.summaryMax}
                            onChange={(professionalSummary) => onChange({...resume, professionalSummary})}
                        />

                        <EditableList
                            label="Skills"
                            hint="One skill per line"
                            values={resume.skills}
                            maxItems={editorLimits.skillsMax}
                            maxLength={80}
                            onChange={(skills) => onChange({...resume, skills})}
                        />

                        <div className="space-y-4">
                            <SectionLabel>Experience</SectionLabel>
                            {resume.experience.map((experience, experienceIndex) => (
                                <div key={experienceIndex} className="rounded-xl border border-[#dfddd6] bg-[#faf9f6] p-4">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <EditableLine
                                            label="Role"
                                            value={experience.title}
                                            maxLength={100}
                                            onChange={(title) => onChange({
                                                ...resume,
                                                experience: replaceAt(resume.experience, experienceIndex, {...experience, title}),
                                            })}
                                        />
                                        <EditableLine
                                            label="Company"
                                            value={experience.company}
                                            maxLength={100}
                                            onChange={(company) => onChange({
                                                ...resume,
                                                experience: replaceAt(resume.experience, experienceIndex, {...experience, company}),
                                            })}
                                        />
                                        <EditableNullableLine
                                            label="Location"
                                            value={experience.location}
                                            maxLength={100}
                                            onChange={(location) => onChange({
                                                ...resume,
                                                experience: replaceAt(resume.experience, experienceIndex, {...experience, location}),
                                            })}
                                        />
                                        <EditableNullableLine
                                            label="Dates"
                                            value={experience.dates}
                                            maxLength={40}
                                            onChange={(dates) => onChange({
                                                ...resume,
                                                experience: replaceAt(resume.experience, experienceIndex, {...experience, dates}),
                                            })}
                                        />
                                    </div>
                                    <div className="mt-4 space-y-3">
                                        {experience.bullets.map((bullet, bulletIndex) => (
                                            <EditableParagraph
                                                key={bulletIndex}
                                                label={`Achievement ${bulletIndex + 1}`}
                                                value={bullet}
                                                maxLength={220}
                                                compact
                                                onChange={(value) => onChange({
                                                    ...resume,
                                                    experience: replaceAt(resume.experience, experienceIndex, {
                                                        ...experience,
                                                        bullets: replaceAt(experience.bullets, bulletIndex, value),
                                                    }),
                                                })}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {resume.projects && resume.projects.length > 0 ? (
                            <div className="space-y-4">
                                <SectionLabel>{projectPresentation.sectionLabel}</SectionLabel>
                                {resume.projects.map((project, projectIndex) => (
                                    <div key={projectIndex} className="rounded-xl border border-[#dfddd6] bg-[#faf9f6] p-4">
                                        <div className="mb-3 flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const projects = removeAt(resume.projects ?? [], projectIndex);
                                                    onChange({...resume, projects: projects.length > 0 ? projects : null});
                                                }}
                                                className="rounded-md px-2 py-1 text-xs font-semibold text-[#666b73] hover:bg-white hover:text-[#181d26] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/20"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                        <EditableLine
                                            label={projectPresentation.itemLabel}
                                            value={project.name}
                                            maxLength={100}
                                            onChange={(name) => onChange({
                                                ...resume,
                                                projects: replaceAt(resume.projects ?? [], projectIndex, {...project, name}),
                                            })}
                                        />
                                        <div className="mt-4">
                                            <EditableList
                                                label={projectPresentation.supportingLabel}
                                                hint={projectPresentation.supportingHint}
                                                values={project.technologies ?? []}
                                                maxItems={8}
                                                maxLength={80}
                                                onChange={(technologies) => onChange({
                                                    ...resume,
                                                    projects: replaceAt(resume.projects ?? [], projectIndex, {
                                                        ...project,
                                                        technologies: technologies.some((value) => value.trim().length > 0) ? technologies : null,
                                                    }),
                                                })}
                                            />
                                        </div>
                                        <div className="mt-4 space-y-3">
                                            {project.bullets.map((bullet, bulletIndex) => (
                                                <EditableParagraph
                                                    key={bulletIndex}
                                                    label={`${projectPresentation.achievementLabel} ${bulletIndex + 1}`}
                                                    value={bullet}
                                                    maxLength={220}
                                                    compact
                                                    onChange={(value) => onChange({
                                                        ...resume,
                                                        projects: replaceAt(resume.projects ?? [], projectIndex, {
                                                            ...project,
                                                            bullets: replaceAt(project.bullets, bulletIndex, value),
                                                        }),
                                                    })}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : null}

                        {resume.credentials && resume.credentials.length > 0 ? (
                            <div className="space-y-4">
                                <SectionLabel>Credentials & licences</SectionLabel>
                                {resume.credentials.map((credential, credentialIndex) => (
                                    <div key={credentialIndex} className="rounded-xl border border-[#dfddd6] bg-[#faf9f6] p-4">
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <EditableLine
                                                label="Credential"
                                                value={credential.name}
                                                maxLength={120}
                                                onChange={(name) => onChange({
                                                    ...resume,
                                                    credentials: replaceAt(resume.credentials ?? [], credentialIndex, {...credential, name}),
                                                })}
                                            />
                                            <EditableNullableLine
                                                label="Issuer"
                                                value={credential.issuer}
                                                maxLength={100}
                                                onChange={(issuer) => onChange({
                                                    ...resume,
                                                    credentials: replaceAt(resume.credentials ?? [], credentialIndex, {...credential, issuer}),
                                                })}
                                            />
                                            <EditableNullableLine
                                                label="Date"
                                                value={credential.date}
                                                maxLength={40}
                                                onChange={(date) => onChange({
                                                    ...resume,
                                                    credentials: replaceAt(resume.credentials ?? [], credentialIndex, {...credential, date}),
                                                })}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : null}

                        <div className="space-y-4">
                            <SectionLabel>Education</SectionLabel>
                            {resume.education.map((education, educationIndex) => (
                                <div key={educationIndex} className="rounded-xl border border-[#dfddd6] bg-[#faf9f6] p-4">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <EditableLine
                                            label="Institution"
                                            value={education.institution}
                                            maxLength={100}
                                            onChange={(institution) => onChange({
                                                ...resume,
                                                education: replaceAt(resume.education, educationIndex, {...education, institution}),
                                            })}
                                        />
                                        <EditableNullableLine
                                            label="Degree"
                                            value={education.degree}
                                            maxLength={120}
                                            onChange={(degree) => onChange({
                                                ...resume,
                                                education: replaceAt(resume.education, educationIndex, {...education, degree}),
                                            })}
                                        />
                                        <EditableNullableLine
                                            label="Dates"
                                            value={education.dates}
                                            maxLength={50}
                                            onChange={(dates) => onChange({
                                                ...resume,
                                                education: replaceAt(resume.education, educationIndex, {...education, dates}),
                                            })}
                                        />
                                    </div>
                                    {education.details && education.details.length > 0 ? (
                                        <div className="mt-4">
                                            <EditableList
                                                label="Details"
                                                hint="One detail per line"
                                                values={education.details}
                                                maxItems={5}
                                                maxLength={300}
                                                onChange={(details) => onChange({
                                                    ...resume,
                                                    education: replaceAt(resume.education, educationIndex, {
                                                        ...education,
                                                        details: details.some((value) => value.trim().length > 0) ? details : null,
                                                    }),
                                                })}
                                            />
                                        </div>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    </fieldset>
                </div>

                <aside className="flex flex-col gap-3 lg:sticky lg:top-0 lg:self-start">
                    <div className="app-panel p-4">
                        <p className="text-sm font-semibold">Review before applying</p>
                        <p className="mt-1 text-xs leading-5 text-[#666b73]">
                            Check dates, skills and achievements. Your edits are included when you download or save.
                        </p>
                    </div>
                    <button type="button" disabled={busy} onClick={onDownload} className="button-secondary w-full disabled:cursor-not-allowed disabled:opacity-50">
                        {action === "download" ? <LoaderCircle className="size-4 animate-spin"/> : <Download className="size-4"/>}
                        Download DOCX
                    </button>
                    <button type="button" disabled={busy} onClick={onSave} className="button-primary w-full disabled:cursor-not-allowed disabled:opacity-50">
                        {action === "save" ? <LoaderCircle className="size-4 animate-spin"/> : <Save className="size-4"/>}
                        Save to library
                    </button>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={onStartAnother}
                        className="w-full rounded-lg px-3 py-2 text-sm font-semibold text-[#59606a] hover:bg-[#f5f4f0] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Tailor another version
                    </button>
                </aside>
            </div>
        </div>
    );
}

function SectionLabel({children}: {children: string}) {
    return <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6f747c]">{children}</p>;
}

function EditableLine({
    label,
    value,
    maxLength,
    onChange,
}: {
    label: string;
    value: string;
    maxLength: number;
    onChange: (value: string) => void;
}) {
    return (
        <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-[#6f747c]">
            {label}
            <input
                value={value}
                maxLength={maxLength}
                onChange={(event) => onChange(event.target.value)}
                className="mt-1.5 h-10 w-full rounded-lg border border-[#d9d6ce] bg-white px-3 text-sm font-normal normal-case tracking-normal text-[#181d26] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
            />
        </label>
    );
}

function EditableNullableLine({
    label,
    value,
    maxLength,
    onChange,
}: {
    label: string;
    value: string | null;
    maxLength: number;
    onChange: (value: string | null) => void;
}) {
    return (
        <EditableLine
            label={label}
            value={value ?? ""}
            maxLength={maxLength}
            onChange={(nextValue) => onChange(nextValue === "" ? null : nextValue)}
        />
    );
}

function EditableParagraph({
    label,
    value,
    maxLength,
    compact = false,
    onChange,
}: {
    label: string;
    value: string;
    maxLength: number;
    compact?: boolean;
    onChange: (value: string) => void;
}) {
    return (
        <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-[#6f747c]">
            {label}
            <textarea
                value={value}
                maxLength={maxLength}
                onChange={(event) => onChange(event.target.value)}
                className={`${compact ? "min-h-20" : "min-h-28"} mt-1.5 w-full resize-y rounded-lg border border-[#d9d6ce] bg-white px-3 py-2.5 text-sm font-normal leading-6 normal-case tracking-normal text-[#181d26] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15`}
            />
        </label>
    );
}

function EditableList({
    label,
    hint,
    values,
    maxItems,
    maxLength,
    onChange,
}: {
    label: string;
    hint: string;
    values: string[];
    maxItems: number;
    maxLength: number;
    onChange: (values: string[]) => void;
}) {
    return (
        <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-[#6f747c]">
            {label}
            <span className="ml-2 font-normal normal-case tracking-normal text-[#8a8e95]">{hint}</span>
            <textarea
                value={values.join("\n")}
                onChange={(event) => onChange(
                    event.target.value
                        .split("\n")
                        .slice(0, maxItems)
                        .map((value) => value.slice(0, maxLength)),
                )}
                className="mt-1.5 min-h-24 w-full resize-y rounded-lg border border-[#d9d6ce] bg-white px-3 py-2.5 text-sm font-normal leading-6 normal-case tracking-normal text-[#181d26] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
            />
        </label>
    );
}

function replaceAt<T>(items: T[], index: number, value: T): T[] {
    return items.map((item, itemIndex) => itemIndex === index ? value : item);
}

function removeAt<T>(items: T[], index: number): T[] {
    return items.filter((_, itemIndex) => itemIndex !== index);
}
