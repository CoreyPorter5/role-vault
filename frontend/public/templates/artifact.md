# RoleVault ATS classic template contract

## Reference

- Retained source: `frontend/src/server/templates/rolevault_ats_classic_template.docx`
- SHA-256: `7A779382CB27743A798CC513FF675BD9C3AC91D7B11F7736A95061B9555DCF9C`
- Sections: 1
- Page count: unresolved for the placeholder-only source because LibreOffice is not installed in the current environment. The production export path must be tested with populated sample data.
- Structural evidence: `.codex-template-qa/template-style-evidence.json`
- Render attempt: `.codex-template-qa/reference-render` (conversion unavailable because `soffice` is not installed)

## Page system

- US Letter portrait: 8.5 by 11 inches.
- Margins: 0.65 inch left/right and 0.55 inch top/bottom.
- One section, no first-page variation and no odd/even-page variation.
- No headers, footers, drawings, fields or content controls.

## Typography and paragraph roles

All resume roles use Arial. Sizes below are Word half-points converted to points.

- `Resume Name`: 28 pt bold; 0 pt after; 11.4 pt automatic line height.
- `Resume Role`: 12 pt; 2 pt before and after.
- `Resume Contact`: 9 pt; 8 pt after.
- `Resume Section Heading`: 11 pt bold; 9 pt before and 4 pt after.
- `Resume Item Header`: 9.5 pt bold; 5 pt before; right tab at 10296 DXA.
- `Resume Item Sub`: 9 pt italic; 1 pt after.
- `Resume Body`: 9.5 pt; 4 pt after.
- `Resume Bullet`: 9 pt; 1 pt after; 12.35 pt automatic line height; left indent 403 DXA and hanging indent 259 DXA.
- `Resume Small`: 8.5 pt; 2 pt after.

The source deliberately uses custom resume styles rather than Word Heading styles. Temporary v1 copies must retain these styles exactly.

## Content flow and slot map

The document is a one-column ATS resume with the following ordered slots:

1. `{fullName}` - candidate name.
2. `{professionalTitle}` - tailored professional title.
3. `{contactLine}` - available contact values joined with separators.
4. Professional summary heading and `{professionalSummary}`.
5. Skills heading and `{skillsLine}`.
6. Experience heading and `{#experience}` loop containing `{title}`, `{company}`, `{dates}`, `{location}` and a nested `{#bullets}` loop.
7. Projects heading and `{#projects}` loop containing `{name}`, `{technologiesLine}` and a nested `{#bullets}` loop.
8. Education heading and `{#education}` loop containing `{institution}`, `{dates}`, `{degree}` and a nested `{#details}` loop.

Docxtemplater loop markers and the surrounding paragraph styles are editable integration slots. All other package content is preserve-only until a category-specific skeleton is supplied.

## Package preservation

The retained package contains these parts, all preserve-only for the six temporary v1 copies:

- `[Content_Types].xml` (1471 bytes)
- `_rels/.rels` (281 bytes)
- `word/_rels/document.xml.rels` (931 bytes)
- `word/document.xml` (7559 bytes)
- `word/endnotes.xml` (1877 bytes)
- `word/footnotes.xml` (1885 bytes)
- `word/numbering.xml` (12345 bytes)
- `word/settings.xml` (1304 bytes)
- `word/styles.xml` (41438 bytes)
- `word/theme/theme1.xml` (6570 bytes)

## Fidelity gates

- The retained source must remain byte-for-byte unchanged.
- Each temporary category DOCX must initially have the same SHA-256 as the retained source.
- Section count, page geometry, named resume styles, numbering and relationships must remain identical.
- When final category skeletons are supplied, each must be rendered with populated sample content and inspected page by page before its registry version is enabled.
- A schema/template placeholder mismatch is a release blocker.

## Released v2 category templates

The five researched v2 templates use the `compact_reference_guide` preset as a density baseline with named resume overrides: US Letter portrait, 0.65-inch side margins, 0.55-inch vertical margins, Arial, a 23 pt name, 9.5–10 pt body text, one muted category accent, one column, no tables and no drawings. The retained source and all v1 files remain unchanged for historical exports.

| Category | Template | Accent | Distinct content flow |
| --- | --- | --- | --- |
| Finance & Accounting | `finance_accounting_v2.docx` | Navy `#17365D` | Finance profile, capabilities and systems, experience, transactions/projects, credentials, education |
| Sales & Marketing | `sales_marketing_v2.docx` | Burgundy `#7A2E4D` | Commercial profile, sales and marketing capabilities, commercial experience, campaigns/selected work, certifications, education |
| People & Operations | `human_resources_admin_operations_v2.docx` | Green `#245B4A` | People and operations profile, core expertise, experience, initiatives, credentials, education |
| Service & Hospitality | `hospitality_retail_customer_service_v2.docx` | Warm brown `#74452D` | Service profile, service capabilities, service experience, licences/training, education; no projects |
| General Professional | `general_professional_other_v2.docx` | Blue `#244A73` | Professional summary, core skills, experience, certifications/licences and education; no projects |

### v2 slot contract

- Shared: `{fullName}`, `{professionalTitle}`, `{contactLine}`, `{professionalSummary}`, `{hasSkills}`, `{skillsLine}`.
- Experience: `{hasExperience}`, `{#experience}`, `{title}`, `{experienceMetaLine}` and nested `{#bullets}` / `{.}`.
- Projects where enabled: `{hasProjects}`, `{#projects}`, `{projectHeadingLine}` and nested `{#bullets}` / `{.}`.
- Credentials: `{hasCredentials}`, `{#credentials}` and `{credentialLine}`.
- Education: `{hasEducation}`, `{#education}`, `{educationLine}`, `{#hasDetails}` and `{educationDetailsLine}`.

The canonical transformation is `src/lib/resume-generation/docx-data.ts`. `tests/resume-profiles.test.mjs` rejects missing templates, non-unique template packages, tables/drawings, missing slot markers, unreplaced tags and schema/template render failures. Populated visual fixtures are generated by `scripts/render_resume_template_samples.mjs` and must be rendered and inspected page by page after changes to the builder.
