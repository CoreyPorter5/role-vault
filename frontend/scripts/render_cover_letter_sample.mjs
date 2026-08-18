import {readFile, writeFile} from "node:fs/promises";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";

const template = await readFile(new URL("../src/server/templates/cover_letter_v1.docx", import.meta.url));
const document = new Docxtemplater(new PizZip(template), {paragraphLoop: true, linebreaks: true});

document.render({
    candidateName: "Jordan Lee",
    contactLine: "Sydney NSW  •  0400 123 456  •  jordan.lee@example.com",
    date: "12 August 2026",
    recipientBlock: "Hiring Manager\nAcme Analytics",
    salutation: "Dear Hiring Manager",
    openingParagraph: "I am applying for the Product Analyst position at Acme Analytics. My experience translating customer and operational data into clear product decisions aligns closely with your need for an analyst who can work across product, engineering and commercial teams. I would bring a practical combination of SQL analysis, stakeholder communication and disciplined experimentation to the role.",
    bodyParagraphs: [
        {text: "In my current role with Harbour Software, I built a self-service reporting workflow that brought product usage, support and revenue signals into one trusted dashboard. I worked with engineers to define reliable event tracking, wrote SQL models to resolve inconsistent definitions and met weekly with product managers to turn findings into prioritised actions. The work reduced recurring manual reporting and helped the team identify an onboarding step associated with early customer drop-off. This experience is directly relevant to Acme Analytics’ focus on using evidence to improve product adoption."},
        {text: "I have also supported structured product experiments from question through to recommendation. For a revised trial experience, I clarified the success measure with stakeholders, checked sample quality, segmented results and documented both the outcome and limitations. Rather than presenting a single headline number, I explained where the effect was strongest and what the data could not establish. That approach enabled the team to proceed with a measured rollout and gave customer success colleagues clear guidance for follow-up. It reflects the careful, collaborative analysis described in your advertisement."},
    ],
    closingParagraph: "I would welcome the opportunity to discuss how my analytical experience and cross-functional working style could support Acme Analytics’ product team. Thank you for considering my application.",
    signOff: "Kind regards",
});

const outputPath = process.argv[2] || "/private/tmp/seeksync-cover-letter-sample.docx";
await writeFile(outputPath, document.getZip().generate({type: "nodebuffer", compression: "DEFLATE"}));
console.log(outputPath);
