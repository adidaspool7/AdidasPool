/**
 * Generates a realistic sample CV as PDF for testing the parsing pipeline.
 * Usage: node scripts/generate-sample-cv.js
 * Output: tests/fixtures/cvs/sample_cv_elena_rossi.pdf
 */

const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const outDir = path.join(__dirname, "..", "tests", "fixtures", "cvs");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "sample_cv_elena_rossi.pdf");

const doc = new PDFDocument({ size: "A4", margin: 50 });
doc.pipe(fs.createWriteStream(outPath));

// ---------- Header ----------
doc
  .fontSize(22)
  .font("Helvetica-Bold")
  .text("Elena Rossi", { align: "left" });

doc
  .moveDown(0.2)
  .fontSize(11)
  .font("Helvetica")
  .fillColor("#444")
  .text(
    "Senior Software Engineer  |  Berlin, Germany  (open to relocation)",
  );

doc
  .moveDown(0.2)
  .fontSize(10)
  .fillColor("#222")
  .text(
    "elena.rossi@example.com  •  +49 170 555 01 42  •  linkedin.com/in/elena-rossi-dev  •  github.com/erossi",
  );

doc.moveDown(0.8);
doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#999").stroke();
doc.moveDown(0.5);

// ---------- Helpers ----------
function sectionTitle(title) {
  doc
    .moveDown(0.5)
    .fontSize(13)
    .font("Helvetica-Bold")
    .fillColor("#111")
    .text(title.toUpperCase(), { characterSpacing: 1 });
  doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).strokeColor("#ccc").stroke();
  doc.moveDown(0.4);
}

function jobHeader(role, company, location, dates) {
  doc
    .fontSize(11)
    .font("Helvetica-Bold")
    .fillColor("#111")
    .text(`${role} — ${company}`, { continued: false });
  doc
    .font("Helvetica-Oblique")
    .fontSize(10)
    .fillColor("#555")
    .text(`${location}  •  ${dates}`);
  doc.moveDown(0.2);
}

function bullets(items) {
  doc.font("Helvetica").fontSize(10).fillColor("#222");
  items.forEach((b) => {
    doc.text(`•  ${b}`, { indent: 10, paragraphGap: 2 });
  });
  doc.moveDown(0.3);
}

// ---------- Summary ----------
sectionTitle("Professional Summary");
doc
  .font("Helvetica")
  .fontSize(10)
  .fillColor("#222")
  .text(
    "Software engineer with 8+ years of experience designing and shipping distributed backend systems, primarily in TypeScript and Go. Led a 6-person team building a multi-tenant SaaS ingestion platform processing ~40M events/day on AWS. Comfortable across the stack: from Postgres query tuning to React component libraries. Native Italian, fluent English (C2), conversational German (B2).",
    { align: "justify" },
  );

// ---------- Experience ----------
sectionTitle("Professional Experience");

jobHeader(
  "Senior Backend Engineer",
  "Zalando SE",
  "Berlin, Germany",
  "March 2022 — Present",
);
bullets([
  "Led migration of the order-events pipeline from RabbitMQ to Kafka, reducing end-to-end latency from 1.8s p95 to 280ms p95.",
  "Designed and implemented a multi-region Postgres failover with logical replication; cut planned-maintenance downtime from ~15 min to under 30s.",
  "Mentored 3 junior engineers; ran weekly architecture reviews.",
  "Tech: TypeScript, Node.js, Go, Kafka, PostgreSQL, Kubernetes, AWS (EKS, RDS, S3).",
]);

jobHeader(
  "Software Engineer",
  "N26 GmbH",
  "Berlin, Germany",
  "June 2019 — February 2022",
);
bullets([
  "Built the internal fraud-rules engine used by ~200 analysts; handled 5k rule evaluations/second.",
  "Introduced contract testing (Pact) across 14 microservices, eliminating an entire class of integration bugs.",
  "Owned on-call rotation for the payments domain.",
  "Tech: Kotlin, Spring Boot, Kafka, PostgreSQL, GCP.",
]);

jobHeader(
  "Full-Stack Developer",
  "Mollie B.V.",
  "Amsterdam, Netherlands",
  "September 2017 — May 2019",
);
bullets([
  "Shipped the first version of the merchant self-service dashboard (React + PHP 7 API) used by ~18k merchants.",
  "Reduced checkout bundle size by 42% via code-splitting and a custom webpack plugin.",
  "Tech: PHP, Symfony, React, TypeScript, MySQL.",
]);

jobHeader(
  "Junior Developer",
  "Accenture",
  "Milan, Italy",
  "October 2016 — August 2017",
);
bullets([
  "Client engagements in the banking sector: internal tooling in Java 8 / Spring.",
  "Graduated from the Accenture Technology Academy with distinction.",
]);

// ---------- Education ----------
sectionTitle("Education");

doc
  .font("Helvetica-Bold")
  .fontSize(11)
  .fillColor("#111")
  .text("M.Sc. Computer Science — Politecnico di Milano");
doc
  .font("Helvetica-Oblique")
  .fontSize(10)
  .fillColor("#555")
  .text("Milan, Italy  •  2014 — 2016  •  Grade: 110/110 cum laude");
doc
  .font("Helvetica")
  .fontSize(10)
  .fillColor("#222")
  .text(
    "Thesis: \"Scalable stream-processing topologies for real-time fraud detection\" (supervised by Prof. Stefano Ceri).",
  );
doc.moveDown(0.3);

doc
  .font("Helvetica-Bold")
  .fontSize(11)
  .fillColor("#111")
  .text("B.Sc. Computer Engineering — Università di Bologna");
doc
  .font("Helvetica-Oblique")
  .fontSize(10)
  .fillColor("#555")
  .text("Bologna, Italy  •  2011 — 2014  •  Grade: 108/110");

// ---------- Skills ----------
sectionTitle("Technical Skills");
doc.font("Helvetica").fontSize(10).fillColor("#222");
doc.text("Languages: TypeScript, JavaScript, Go, Kotlin, Python, SQL, Bash");
doc.text(
  "Frameworks: Node.js, Next.js, NestJS, Spring Boot, React, Express, Fastify",
);
doc.text(
  "Data: PostgreSQL, MySQL, Redis, Kafka, RabbitMQ, Elasticsearch, ClickHouse",
);
doc.text("Cloud & DevOps: AWS (EKS, RDS, S3, Lambda), GCP, Terraform, Docker, Kubernetes, GitHub Actions");
doc.text("Practices: TDD, DDD, event-driven architecture, OpenTelemetry, SRE on-call");

// ---------- Languages ----------
sectionTitle("Languages");
doc.font("Helvetica").fontSize(10).fillColor("#222");
doc.text("• Italian — Native");
doc.text("• English — C2 (Cambridge CPE, 2018)");
doc.text("• German — B2 (Goethe-Zertifikat, 2023)");
doc.text("• Spanish — A2");

// ---------- Certifications ----------
sectionTitle("Certifications");
doc.font("Helvetica").fontSize(10).fillColor("#222");
doc.text("• AWS Certified Solutions Architect — Associate (2023)");
doc.text("• Certified Kubernetes Application Developer (CKAD) (2022)");
doc.text("• Confluent Certified Developer for Apache Kafka (2021)");

// ---------- Projects ----------
sectionTitle("Selected Open-Source Contributions");
doc.font("Helvetica").fontSize(10).fillColor("#222");
doc.text(
  "• kafkajs — maintainer; contributed the SASL/OAUTHBEARER implementation (PR #1432).",
);
doc.text(
  "• drizzle-orm — contributor; added partial-index support for PostgreSQL dialect (PR #2178).",
);

doc.end();

doc.on("end", () => {
  console.log(`Wrote ${outPath}`);
});
