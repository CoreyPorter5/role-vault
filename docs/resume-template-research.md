# Resume profile and template research

Research date: 13 August 2026

This note records the evidence behind RoleVault's v2 finance, sales and marketing, people and operations, service and hospitality, and general professional resume profiles. It is a product-writing guide, not a promise that any format guarantees an interview.

## Shared rules

- Use one column, a common font at 10 pt or larger, standard section names and conventional bullets. Avoid tables, columns, graphics, icons, images and text boxes because ATS software can ignore, distort or reorder their content. Source: [MIT Career Advising — Make your resume ATS-friendly](https://capd.mit.edu/resources/make-your-resume-ats-friendly/).
- Tailor terminology to the listing only when it truthfully describes source evidence. Relevance and meaningful keywords matter; keyword stuffing and unsupported additions do not. Source: [MIT Career Advising — Make your resume ATS-friendly](https://capd.mit.edu/resources/make-your-resume-ats-friendly/).
- Write achievement bullets as action + context/task + result, and quantify financial effect, improvement, scale, volume, team, budget or data only when the source provides the figure. Source: [MIT Career Advising — Writing about your skills](https://capd.mit.edu/resources/resumes-writing-about-your-skills/).
- Keep reverse chronology for dated sections and place the most relevant undated content first. Source: [MIT Career Advising — Enhance your resume](https://capd.mit.edu/blog/2023/09/01/enhance-your-resume-a-guide-for-first-year-undergraduates/).
- Keep content selective enough for one page for many early-career candidates and up to two evidence-rich pages for experienced candidates. The templates use compact but readable spacing and never shrink body copy below roughly 9.5–10 pt.

## Finance and accounting

Research signals:

- Recruiters need to identify relevant systems, industries and core skills quickly; named systems should be specific, and achievements should sit inside the role where they occurred. Source: [CPA Australia INTHEBLACK — Make your accounting and finance resume stand out](https://intheblack.cpaaustralia.com.au/careers-and-workplace/make-your-accounting-and-finance-resume-stand-out).
- Strong finance evidence includes reporting or transaction scale, accuracy, control/compliance, process improvements, cost, EBIT, cash flow, forecasting and supported commercial outcomes. Credentials must be exact and never embellished.
- Conservative presentation is appropriate: the v2 template uses a restrained navy accent, finance capabilities and systems near the top, then reverse-chronological experience, selected transactions/projects, credentials and education.

Schema implications:

- Finance-specific descriptions steer the model toward systems, controls, scale and commercial outcomes.
- Projects are limited to two real transactions, audits, models, implementations or transformations.
- Credentials are first-class structured data rather than being buried in education details.

## Sales and marketing

Research signals:

- Current sales roles foreground full-cycle ownership, self-sourced pipeline, deal activity, quota attainment, discovery, demos and net-new revenue. Source: [HubSpot — Account Executive, Small Business](https://www.hubspot.com/careers/jobs/5990225).
- Marketing resumes should describe accomplishments rather than activity: for example, traffic, conversion, pipeline, revenue, retention or ROI changes rather than simply the number of campaigns delivered. Source: [American Marketing Association — 8 ways marketers can improve their resumes](https://www.ama.org/marketing-news/8-ways-marketers-can-improve-their-resumes/).
- A useful portfolio case study explains the problem, strategy/action and result with evidence such as engagement, conversion, sales, paid-media ROI or lifecycle outcomes. Source: [American Marketing Association — Digital marketing portfolio guidance](https://www.ama.org/marketing-news/top-11-reasons-to-choose-a-digital-marketing-career-in-2025/).

Schema implications:

- The summary names the supported market, audience, sales motion or channel and strongest outcome.
- Experience prioritises quota, revenue, pipeline, conversion, acquisition, retention, reach, engagement and ROI.
- Up to three campaigns, launches or case studies can be represented as projects, and the template preserves portfolio links in the contact line.

## People, administration and operations

Research signals:

- Effective HR resumes provide useful organisation context, emphasise contributions to business objectives and culture, show measurable results, use relevant competencies and clearly present professional credentials. Source: [SHRM — How to write a powerful and memorable HR resume](https://www.shrm.org/topics-tools/news/organizational-employee-development/how-to-write-powerful-memorable-hr-resume).
- The people profession is principles-led, evidence-based and outcomes-driven; organisational data and stakeholder evidence should inform decisions. Source: [CIPD — Building an evidence-based people profession](https://www.cipd.org/en/views-and-insights/thought-leadership/insight/evidence-based-profession/).
- Project and operational evidence is stronger when it states scope such as budget, timeline, team size, workstreams and stakeholders, followed by the delivery outcome. Source: [PMI — Build a resume that stands out for project roles](https://www.pmi.org/zh-cn/disciplined-agile/sitecore/content/pmiheadless/home/blog/blog-posts/2026/05/15/01/02/how-to-build-a-resume-that-stands-out-for-project-roles).
- Where relevant, operations outcomes can include reliability, cycle time, cost, EBIT, working capital, training and safety. Source: [ASCM — SCOR performance metrics](https://scor.ascm.org/performance/introduction).

Schema implications:

- One profile supports HR, administration, project coordination and operations without treating them as identical. The prompt must retain the candidate's evidenced function and seniority.
- Experience prioritises supported organisation/workforce/project/vendor scope, service quality, compliance, adoption, cycle-time, cost and people outcomes.
- Up to three explicit initiatives may be separate projects; HR, change, project, safety and systems credentials have a dedicated section.

## Service, hospitality, retail and customer service

Research signals:

- Employer requirements repeatedly cover guest/customer service, diverse communication, complaint resolution, accurate POS/cash handling, fast-paced multitasking, hygiene and food safety, teamwork, training, scheduling, stock, wait time and shift flexibility. Source: [National Restaurant Association — Restaurant industry job descriptions](https://restaurant.org/education-and-resources/learning-center/workforce-engagement/restaurant-industry-job-descriptions/).
- Australian café and restaurant manager work includes customer satisfaction, product mix and service standards, functions, health compliance, staff selection/training/supervision, stock records, financial transactions, purchasing and pricing. Source: [Jobs and Skills Australia — Café and Restaurant Managers](https://www.jobsandskills.gov.au/data/occupation-and-industry-profiles/occupations/1411-cafe-and-restaurant-managers).

Schema implications:

- The profile prioritises service environment and volume, satisfaction, complaint handling, speed, accuracy, sales, safety, cleanliness, teamwork and shift leadership.
- Projects are always `null`; service initiatives remain under the job where they happened so the document stays direct and easy to scan.
- RSA, RCG, food safety, first aid, barista and similar supported licences are structured separately and appear before education.

## General professional

Research signals:

- A general resume still needs to be targeted: include skills that relate to the job, evidence of what the candidate did, and why that evidence matters. Source: [Workforce Australia — Write a resume](https://www.workforceaustralia.gov.au/individuals/coaching/job-applications/resumes).
- The shared action/context/result and ATS rules apply. “General” must never become generic: it should prioritise the supported function, seniority and transferable outcomes for the target role.

Schema implications:

- Skills are specific and evidenced rather than a list of personality claims.
- Projects are always `null`. A catch-all category does not provide enough evidence that a separate project section is appropriate, so relevant initiatives stay under the role where they occurred.
- Credentials and licences remain structured so the template works for regulated and non-regulated professional roles.

## Template system decision

The DOCX files use the `compact_reference_guide` design preset as their density baseline, with named resume-specific overrides: US Letter portrait, 0.65-inch side margins, 0.55-inch top/bottom margins, Arial throughout, 9.5–10 pt body copy, 23 pt name, 10.2 pt section labels, muted single-colour rules, naturally wrapping role/date metadata, standard round bullets and no tables, columns, drawings, headers or footers. Each category changes section order, labels and accent colour while retaining the same conservative parsing behaviour.

Version 1 files remain registered for historical drafts. The five new category schemas and templates are version 2; technology remains version 1 until it receives its own researched revision.
