import {createResumeProfileSchema} from "./base-schema.ts";

export const salesMarketingResumeSchema = createResumeProfileSchema({
    summaryDescription: "A compact commercial positioning statement grounded in the candidate's supported market, audience, channel, sales motion and strongest revenue, pipeline, growth or campaign outcome.",
    summaryMax: 440,
    skillsDescription: "Four to twelve supported commercial capabilities, channels, platforms and methods. Prefer role language such as discovery, pipeline, CRM, lifecycle, content, paid media, SEO, analytics or conversion only when evidenced.",
    skillsMax: 12,
    experienceDescription: "Reverse-chronological sales and marketing experience focused on quota, pipeline, acquisition, conversion, retention, campaign reach, ROI, stakeholder influence and customer outcomes supported by the source.",
    experienceMax: 5,
    projectDescription: "Return null by default. Include at most two items only when the master resume contains a distinct sales or marketing campaign, launch, portfolio case study or commercial initiative that is directly relevant to the target job and has a supported problem, action and commercial result. Do not include technical, software, academic or personal projects merely because they appear in the source.",
    projectMax: 2,
    projectBulletMax: 4,
    credentialsDescription: "Supported platform certifications, professional accreditations or relevant licences. Return null rather than inventing common vendor credentials.",
    credentialsMax: 6,
    educationDescription: "Reverse-chronological education with relevant specialisations or supported distinctions; keep it secondary to proven commercial performance for experienced candidates.",
    educationMax: 3,
});
