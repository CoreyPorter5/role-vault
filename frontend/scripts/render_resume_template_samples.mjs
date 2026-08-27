#!/usr/bin/env node

import {mkdir, readFile, writeFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import {createResumeTemplateData} from "../src/lib/resume-generation/docx-data.ts";

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = process.env.RESUME_TEMPLATE_QA_DIR || "/private/tmp/rolevault-resume-template-qa";

const base = {
    fullName: "Alex Morgan",
    contact: {
        location: "Sydney NSW",
        phone: "0400 123 456",
        email: "alex.morgan@example.com",
        linkedin: "linkedin.com/in/alexmorgan",
        github: null,
        portfolioSite: null,
    },
};

export const resumeTemplateSamples = {
    finance_accounting: {
        ...base,
        professionalTitle: "Commercial Finance Analyst",
        professionalSummary: "Commercial finance analyst with five years of experience supporting retail and technology businesses through management reporting, forecasting and control improvement. Advanced Excel, Power BI and NetSuite experience, with a record of shortening month-end close and translating financial drivers into clear decisions.",
        skills: ["Management reporting", "Financial modelling", "Budgeting & forecasting", "Variance analysis", "Month-end close", "Internal controls", "Advanced Excel", "Power BI", "NetSuite", "Stakeholder partnering"],
        experience: [
            {
                title: "Senior Financial Analyst",
                company: "Harbour Retail Group",
                location: "Sydney NSW",
                dates: "Jul 2023 – Present",
                bullets: [
                    "Built weekly sales and margin reporting across 42 stores, giving commercial leaders a consistent view of category and channel performance.",
                    "Redesigned the rolling forecast model in Excel and Power BI, reducing monthly preparation time by 30% while preserving documented assumptions.",
                    "Partnered with procurement to analyse supplier terms and inventory movements, identifying $420,000 in annual working-capital opportunities.",
                    "Introduced month-end reconciliations and ownership checks that shortened close from eight business days to six.",
                ],
            },
            {
                title: "Financial Analyst",
                company: "Northstar Software",
                location: "Sydney NSW",
                dates: "Feb 2021 – Jun 2023",
                bullets: [
                    "Prepared monthly management packs covering revenue, operating expenditure, headcount and cash performance for the executive team.",
                    "Modelled customer cohorts and renewal scenarios for annual planning, helping leaders compare growth investments against margin targets.",
                    "Automated recurring NetSuite exports and validation checks, saving approximately 12 analyst hours each month.",
                ],
            },
            {
                title: "Assistant Accountant",
                company: "Linden Advisory",
                location: "Parramatta NSW",
                dates: "Jan 2019 – Jan 2021",
                bullets: [
                    "Completed balance-sheet reconciliations and journals for a portfolio of 18 small-business clients under monthly reporting deadlines.",
                    "Resolved supplier and billing discrepancies by tracing source records and documenting corrections for manager review.",
                    "Created a standard close checklist that improved handovers and reduced repeated review comments across the team.",
                ],
            },
        ],
        projects: [{
            name: "Finance reporting transformation",
            technologies: ["Power BI", "Excel", "NetSuite"],
            bullets: [
                "Mapped 26 recurring reports to decision owners and retired duplicated outputs after stakeholder review.",
                "Established reconciled data definitions and a monthly quality check before dashboard publication.",
                "Trained eight finance and commercial users and documented the reporting calendar and source controls.",
            ],
        }],
        credentials: [
            {name: "Certified Practising Accountant (CPA)", issuer: "CPA Australia", date: "2023"},
            {name: "Microsoft Certified: Power BI Data Analyst Associate", issuer: "Microsoft", date: "2024"},
        ],
        education: [{
            institution: "University of Technology Sydney",
            degree: "Bachelor of Business (Accounting and Finance)",
            dates: "2016 – 2018",
            details: ["Dean's Merit List, 2018", "Relevant study: corporate finance, taxation and audit"],
        }],
    },
    sales_marketing: {
        ...base,
        professionalTitle: "Growth Marketing Manager",
        contact: {...base.contact, portfolioSite: "alexmorgan.com/work"},
        professionalSummary: "Growth marketer with six years of experience building acquisition and lifecycle programs for subscription businesses. Combines campaign strategy, performance analysis and cross-functional delivery, with supported results across qualified pipeline, conversion and retention.",
        skills: ["Growth strategy", "Lifecycle marketing", "Paid search", "Content strategy", "Marketing automation", "Campaign analytics", "Conversion optimisation", "HubSpot", "Google Analytics 4", "Stakeholder management"],
        experience: [
            {
                title: "Growth Marketing Manager",
                company: "BrightPath Learning",
                location: "Sydney NSW",
                dates: "Mar 2023 – Present",
                bullets: [
                    "Led quarterly acquisition programs across paid search, content and partner channels, contributing $2.1 million in qualified pipeline in 2025.",
                    "Rebuilt lead nurture journeys in HubSpot using audience behaviour and sales feedback, increasing marketing-qualified-to-opportunity conversion from 18% to 24%.",
                    "Introduced campaign briefs and post-launch reviews linking spend, leads, opportunities and revenue to improve channel investment decisions.",
                    "Managed agency and internal creative delivery across Australia and New Zealand while maintaining a shared launch calendar.",
                ],
            },
            {
                title: "Digital Marketing Specialist",
                company: "Marlow Health",
                location: "Melbourne VIC",
                dates: "Jan 2020 – Feb 2023",
                bullets: [
                    "Planned and optimised paid search and social campaigns that reduced cost per qualified lead by 22% over 12 months.",
                    "Produced landing-page experiments with product and design teams, lifting booking conversion from 6.4% to 8.1%.",
                    "Built GA4 and CRM reporting that gave sales and marketing a shared weekly view of funnel performance.",
                ],
            },
            {
                title: "Marketing Coordinator",
                company: "Civic Arts Collective",
                location: "Melbourne VIC",
                dates: "Feb 2018 – Dec 2019",
                bullets: [
                    "Coordinated email, social and venue campaigns for 30 annual events while maintaining brand and approval requirements.",
                    "Segmented subscriber communications by attendance history, improving average email click-through rate by 17%.",
                    "Compiled campaign results and audience feedback into concise recommendations for the following season.",
                ],
            },
        ],
        projects: [
            {
                name: "Small-business acquisition launch",
                technologies: ["HubSpot", "GA4", "Google Ads"],
                bullets: [
                    "Defined the audience, offer and measurement plan with sales before creative production began.",
                    "Delivered paid, content and lifecycle assets through a six-week cross-functional launch plan.",
                    "Generated 640 leads and $780,000 in sourced pipeline at a 4.2-times pipeline-to-spend ratio.",
                ],
            },
            {
                name: "Lifecycle onboarding case study",
                technologies: ["HubSpot", "Looker Studio"],
                bullets: [
                    "Mapped the first 30 days of customer behaviour and identified two high-friction onboarding steps.",
                    "Tested behaviour-triggered education and sales-assist messages with customer success.",
                    "Improved 30-day product activation by 11% across the measured cohort.",
                ],
            },
        ],
        credentials: [
            {name: "Google Ads Search Certification", issuer: "Google", date: "2025"},
            {name: "HubSpot Marketing Software Certification", issuer: "HubSpot Academy", date: "2025"},
        ],
        education: [{
            institution: "RMIT University",
            degree: "Bachelor of Communication (Advertising)",
            dates: "2015 – 2017",
            details: ["Minor in digital media", "Capstone focused on audience research and campaign measurement"],
        }],
    },
    legal: {
        ...base,
        professionalTitle: "Law Graduate",
        professionalSummary: "Final-year Juris Doctor candidate with experience supporting commercial litigation and community legal matters through legal research, drafting, document review and careful file management. Brings clear written communication, sound judgement with confidential material and evidence of balancing client, academic and team deadlines.",
        skills: ["Legal research", "Legal writing", "Drafting", "Document review", "Discovery", "Matter management", "Client communication", "Commercial awareness", "Plain-English communication"],
        experience: [
            {
                title: "Paralegal",
                company: "Harbour Legal",
                location: "Sydney NSW",
                dates: "Feb 2025 – Present",
                bullets: [
                    "Research legislation, authorities and procedural requirements for commercial disputes, preparing concise research notes for solicitor review.",
                    "Draft chronologies, correspondence, file notes and first-pass court documents using approved precedents and matter instructions.",
                    "Review and code discovery material, maintain issue lists and coordinate document production deadlines across three active matters.",
                    "Communicate with clients and external parties to arrange conferences and obtain documents while preserving confidentiality and accurate file records.",
                ],
            },
            {
                title: "Student Volunteer",
                company: "Inner City Community Legal Centre",
                location: "Sydney NSW",
                dates: "Aug 2024 – Nov 2024",
                bullets: [
                    "Completed supervised client intake, identified relevant facts and prepared clear attendance notes for advice appointments.",
                    "Researched tenancy and consumer-law questions and summarised options in plain English for supervising solicitors.",
                    "Updated referral information and matter records in accordance with the centre's privacy and recordkeeping procedures.",
                ],
            },
            {
                title: "Customer Service Supervisor",
                company: "Campus Services Australia",
                location: "Sydney NSW",
                dates: "Mar 2022 – Jan 2025",
                bullets: [
                    "Resolved escalated customer issues and documented agreed outcomes while leading shifts of up to eight team members.",
                    "Balanced work and study deadlines across peak service periods, maintaining accurate cash, incident and handover records.",
                ],
            },
        ],
        projects: null,
        credentials: [
            {name: "Practical Legal Training", issuer: "The College of Law Australia", date: "Expected Jun 2027"},
            {name: "Admission to the Supreme Court of New South Wales", issuer: null, date: "Expected Aug 2027"},
        ],
        education: [{
            institution: "University of Sydney",
            degree: "Juris Doctor",
            dates: "2024 – Expected 2026",
            details: ["Distinction average", "Administrative Law Moot — semi-finalist", "Sydney Law Review — student editor", "Relevant study: Evidence, Corporations Law and Civil & Criminal Procedure"],
        }],
    },
    human_resources_admin_operations: {
        ...base,
        professionalTitle: "People Operations Partner",
        professionalSummary: "People operations professional with seven years of experience supporting multi-site teams through recruitment, employee services, HR systems and process improvement. Known for reliable case coordination, evidence-based reporting and practical change delivery across managers, employees and service partners.",
        skills: ["People operations", "Employee lifecycle", "Recruitment coordination", "HR policy", "Employee relations support", "HRIS administration", "Workforce reporting", "Process improvement", "Change coordination", "Vendor management", "Workday", "Excel"],
        experience: [
            {
                title: "People Operations Partner",
                company: "Southern Grid Services",
                location: "Sydney NSW",
                dates: "May 2022 – Present",
                bullets: [
                    "Provide people operations support to 620 employees and 85 people leaders across five locations, coordinating cases with specialist HR teams where required.",
                    "Redesigned onboarding ownership and status reporting, increasing completion of required pre-start tasks from 82% to 97%.",
                    "Built monthly workforce reporting covering vacancies, turnover, absence and service requests for the people leadership team.",
                    "Coordinated policy updates, manager briefings and employee communications while maintaining version and approval records.",
                ],
            },
            {
                title: "HR Coordinator",
                company: "Oak & Coast Hotels",
                location: "Sydney NSW",
                dates: "Aug 2019 – Apr 2022",
                bullets: [
                    "Coordinated recruitment and onboarding for hotel and corporate roles, scheduling more than 300 interviews annually across dispersed managers.",
                    "Maintained employee records and contract changes in Workday, resolving data discrepancies before payroll cut-off.",
                    "Created manager guides for common lifecycle processes, reducing incomplete service requests by 28% over six months.",
                ],
            },
            {
                title: "Operations Administrator",
                company: "Westline Community Care",
                location: "Newcastle NSW",
                dates: "Jan 2017 – Jul 2019",
                bullets: [
                    "Scheduled a mobile team of 45 staff while balancing client requirements, leave and qualification constraints.",
                    "Prepared weekly service and exception reports for operations managers and followed up missing records before invoicing.",
                    "Documented the supplier purchase process and introduced an approval register that improved audit traceability.",
                ],
            },
        ],
        projects: [
            {
                name: "HR service portal rollout",
                technologies: ["ServiceNow", "Workday", "Excel"],
                bullets: [
                    "Mapped 34 request types and escalation paths with payroll, HR, IT and business representatives.",
                    "Coordinated user acceptance testing and issue triage across a 20-person pilot group.",
                    "Supported launch communications and weekly adoption reporting as portal usage reached 88% of eligible requests.",
                ],
            },
            {
                name: "Operational roster review",
                technologies: ["Excel", "Deputy"],
                bullets: [
                    "Analysed shift coverage, overtime and service demand across three operating locations.",
                    "Facilitated manager review of constraints and trialled a standard planning rhythm.",
                    "Reduced last-minute agency shifts by 19% during the 12-week trial.",
                ],
            },
        ],
        credentials: [
            {name: "Associate Member", issuer: "Australian HR Institute", date: "2024"},
            {name: "Prosci Change Management Certification", issuer: "Prosci", date: "2023"},
        ],
        education: [{
            institution: "Macquarie University",
            degree: "Bachelor of Commerce (Human Resources)",
            dates: "2013 – 2016",
            details: ["Study included employment relations, organisational behaviour and business analytics"],
        }],
    },
    hospitality_retail_customer_service: {
        ...base,
        professionalTitle: "Restaurant & Guest Service Supervisor",
        professionalSummary: "Guest service supervisor with six years of experience in high-volume restaurants and events. Brings calm shift leadership, accurate cash and POS handling, practical complaint resolution and consistent food-safety standards across busy evening and weekend services.",
        skills: ["Guest service", "Shift supervision", "POS & cash handling", "Complaint resolution", "Reservations", "Food safety", "Stock control", "Upselling", "Staff training", "Opening & closing", "Team coordination"],
        experience: [
            {
                title: "Restaurant Supervisor",
                company: "Harbour House Dining",
                location: "Sydney NSW",
                dates: "Sep 2022 – Present",
                bullets: [
                    "Lead front-of-house shifts of up to 16 team members across services of 250 guests while coordinating reservations, sections and kitchen communication.",
                    "Resolve guest concerns during service and record follow-up actions, contributing to an average 4.7-star review score in 2025.",
                    "Train new team members in POS, menu knowledge, responsible service and opening and closing procedures.",
                    "Complete end-of-shift cash reconciliation and stock checks, escalating discrepancies through the documented manager process.",
                ],
            },
            {
                title: "Senior Food & Beverage Attendant",
                company: "Quayside Events",
                location: "Sydney NSW",
                dates: "Mar 2020 – Aug 2022",
                bullets: [
                    "Delivered table and bar service at functions of 80 to 600 guests while adapting to dietary, timing and event-plan requirements.",
                    "Coordinated briefing notes and station setup for casual teams, improving readiness before guest arrival.",
                    "Maintained food-safety, responsible-service and venue presentation standards throughout event close-down.",
                ],
            },
            {
                title: "Customer Service Team Member",
                company: "Market Lane Grocer",
                location: "Sydney NSW",
                dates: "Feb 2018 – Feb 2020",
                bullets: [
                    "Processed cash, card and digital payments accurately during high-volume lunch and evening periods.",
                    "Answered product and allergen questions, escalated issues appropriately and supported customers with returns.",
                    "Replenished stock and completed date and presentation checks before opening and handover.",
                ],
            },
        ],
        projects: null,
        credentials: [
            {name: "Responsible Service of Alcohol (RSA)", issuer: "Service NSW", date: "Current"},
            {name: "Food Safety Supervisor Certificate", issuer: "NSW Food Authority approved provider", date: "2024"},
            {name: "HLTAID011 Provide First Aid", issuer: "St John Ambulance Australia", date: "2025"},
        ],
        education: [{
            institution: "TAFE NSW",
            degree: "Certificate IV in Hospitality",
            dates: "2019",
            details: ["Training included service operations, team leadership and workplace safety"],
        }],
    },
    general_professional_other: {
        ...base,
        professionalTitle: "Program Coordinator",
        professionalSummary: "Program coordinator with five years of experience delivering community and education initiatives through structured planning, stakeholder communication and accurate reporting. Experienced in coordinating vendors, events, budgets and participant services while improving practical team workflows.",
        skills: ["Program coordination", "Stakeholder communication", "Event delivery", "Budget tracking", "Reporting", "Vendor coordination", "Process improvement", "Microsoft 365", "Salesforce", "Risk registers"],
        experience: [
            {
                title: "Program Coordinator",
                company: "Future Skills Foundation",
                location: "Sydney NSW",
                dates: "Apr 2022 – Present",
                bullets: [
                    "Coordinate six annual education programs serving more than 1,200 participants across metropolitan and regional locations.",
                    "Maintain delivery plans, budgets, risk registers and stakeholder updates for program leads and funding partners.",
                    "Introduced a shared intake and status workflow in Salesforce, reducing duplicate follow-up and improving weekly reporting accuracy.",
                    "Manage facilitator and venue suppliers from quotation through invoice reconciliation within approved budgets.",
                ],
            },
            {
                title: "Project Administrator",
                company: "Civic Learning Network",
                location: "Sydney NSW",
                dates: "Jan 2020 – Mar 2022",
                bullets: [
                    "Supported three concurrent projects through meeting coordination, action tracking, document control and monthly reporting.",
                    "Prepared participant communications and service materials, checking accessibility, approval and distribution requirements.",
                    "Reconciled project expenditure and resolved missing invoice information before monthly finance deadlines.",
                ],
            },
            {
                title: "Administration Assistant",
                company: "Northside Community Centre",
                location: "Sydney NSW",
                dates: "Feb 2018 – Dec 2019",
                bullets: [
                    "Managed reception enquiries, room bookings and records while providing timely service to community members and partner organisations.",
                    "Created a booking checklist that reduced room setup omissions during weekly events.",
                    "Compiled attendance and feedback data for quarterly board and funder reports.",
                ],
            },
        ],
        projects: null,
        credentials: [
            {name: "PRINCE2 Foundation", issuer: "PeopleCert", date: "2024"},
            {name: "Working with Children Check", issuer: "Service NSW", date: "Current"},
        ],
        education: [{
            institution: "University of Wollongong",
            degree: "Bachelor of Arts (Sociology)",
            dates: "2015 – 2017",
            details: ["Coursework included program evaluation and social research methods"],
        }],
    },
};

await mkdir(outputDir, {recursive: true});

for (const [category, resume] of Object.entries(resumeTemplateSamples)) {
    const templatePath = path.join(frontendRoot, "src", "server", "templates", `${category}_v2.docx`);
    const template = await readFile(templatePath);
    const document = new Docxtemplater(new PizZip(template), {
        paragraphLoop: true,
        linebreaks: true,
    });
    document.render(createResumeTemplateData(resume));
    const output = document.getZip().generate({type: "nodebuffer", compression: "DEFLATE"});
    const outputPath = path.join(outputDir, `${category}_sample.docx`);
    await writeFile(outputPath, output);
    console.log(outputPath);
}
