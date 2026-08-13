import type {TailoredResume} from "./profiles/base-schema";

/**
 * Adds presentation-only fields to the validated resume object. Keeping this
 * transformation outside the route lets template contract tests exercise the
 * exact data that Docxtemplater receives.
 */
export function createResumeTemplateData(resume: TailoredResume) {
    const experience = (resume.experience ?? []).map(item => ({
        ...item,
        experienceMetaLine: [item.company, item.location, item.dates].filter(Boolean).join(" | "),
    }));
    const projects = (resume.projects ?? []).map(project => ({
        ...project,
        technologiesLine: (project.technologies ?? []).filter(Boolean).join(", "),
        projectHeadingLine: [
            project.name,
            (project.technologies ?? []).filter(Boolean).join(", "),
        ].filter(Boolean).join(" | "),
        bullets: project.bullets ?? [],
    }));
    const credentials = (resume.credentials ?? []).map(credential => ({
        ...credential,
        credentialLine: [credential.name, credential.issuer, credential.date].filter(Boolean).join(" | "),
    }));
    const education = (resume.education ?? []).map(item => ({
        ...item,
        educationLine: [item.institution, item.degree, item.dates].filter(Boolean).join(" | "),
        details: item.details ?? [],
        hasDetails: (item.details ?? []).some(Boolean),
        educationDetailsLine: (item.details ?? []).filter(Boolean).join("  •  "),
    }));

    return {
        ...resume,
        contactLine: [
            resume.contact.location,
            resume.contact.phone,
            resume.contact.email,
            resume.contact.linkedin,
            resume.contact.github,
            resume.contact.portfolioSite,
        ].filter(Boolean).join(" | "),
        experience,
        hasExperience: experience.length > 0,
        projects,
        hasProjects: projects.length > 0,
        credentials,
        hasCredentials: credentials.length > 0,
        education,
        hasEducation: education.length > 0,
        skillsLine: (resume.skills ?? []).filter(Boolean).join("  •  "),
        hasSkills: (resume.skills ?? []).some(Boolean),
    };
}
