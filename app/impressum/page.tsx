import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Legal Notice (Impressum) - Streamer Times",
  description:
    "Streamer Times Legal Notice (Impressum). Information in accordance with § 5 TMG.",
  alternates: { canonical: "/impressum" },
};

const sections = [
  {
    heading: "Information in Accordance with § 5 TMG",
    paragraphs: [
      "Werner Schütze",
      "Schlierseestr. 14",
      "81541 München",
      "Germany",
    ],
  },
  {
    heading: "Contact",
    paragraphs: ["Email: StreamHub.Privacy@icloud.com"],
  },
  {
    heading: "Responsible for Content (§ 55 Abs. 2 RStV)",
    paragraphs: [
      "Werner Schütze",
      "Schlierseestr. 14",
      "81541 München",
      "Germany",
    ],
  },
  {
    heading: "Liability for Content",
    paragraphs: [
      "The contents of our pages were created with the greatest care. However, we cannot guarantee the accuracy, completeness, or timeliness of the content. As a service provider, we are responsible for our own content on these pages in accordance with general laws pursuant to § 7 Abs. 1 TMG. However, according to §§ 8 to 10 TMG, we are not obligated to monitor transmitted or stored third-party information or to investigate circumstances that indicate illegal activity.",
      "Obligations to remove or block the use of information under general laws remain unaffected. However, liability in this regard is only possible from the time of knowledge of a specific infringement. If we become aware of any such legal violations, we will remove the content in question immediately.",
    ],
  },
  {
    heading: "Liability for Links",
    paragraphs: [
      "Our website contains links to external third-party websites over whose content we have no influence. Therefore, we cannot accept any liability for this third-party content. The respective provider or operator of the linked pages is always responsible for the content of the linked pages.",
      "The linked pages were checked for possible legal violations at the time of linking. Illegal content was not recognizable at the time of linking. However, permanent monitoring of the content of the linked pages is not reasonable without concrete evidence of a legal violation. If we become aware of any legal violations, we will remove such links immediately.",
    ],
  },
  {
    heading: "Copyright",
    paragraphs: [
      "The content and works on these pages created by the site operator are subject to German copyright law. Duplication, processing, distribution, or any form of commercialization of such material beyond the scope of copyright law requires the prior written consent of the respective author or creator.",
      "Insofar as the content on this site was not created by the operator, the copyrights of third parties are respected. In particular, third-party content is identified as such. Should you nevertheless become aware of a copyright infringement, please inform us accordingly. If we become aware of any infringements, we will remove such content immediately.",
    ],
  },
];

export default function Impressum() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-accent-cyan"
      >
        <ArrowLeft size={16} />
        Back to Streamer Times
      </Link>

      <h1 className="mb-2 text-3xl font-bold text-text-primary">
        Legal Notice (Impressum)
      </h1>
      <p className="mb-12 text-sm text-text-muted">
        Last updated: April 5, 2026
      </p>

      {sections.map((section) => (
        <div key={section.heading} className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-text-primary">
            {section.heading}
          </h2>
          {section.paragraphs.map((paragraph, i) => (
            <p
              key={i}
              className="mb-3 text-sm leading-relaxed text-text-secondary"
            >
              {paragraph}
            </p>
          ))}
        </div>
      ))}

      <footer className="mt-16 border-t border-divider pt-8 text-center text-sm text-text-muted">
        &copy; {new Date().getFullYear()} Streamer Times. All rights reserved.
      </footer>
    </main>
  );
}
