// M26 income model (2026-08-18): public methodology page for the data-driven
// "Estimated monthly income" fact on streamer wiki pages. This page is the
// SOURCE LINK those facts cite — it must describe exactly what
// supabase/functions/_shared/income-estimate.ts computes (parameters are
// mirrored here by hand; change them together).
//
// EN-only content page (privacy-policy pattern): indexable at /methodology/
// income-estimates, noindex+follow self-canonical on every other locale.

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { isUiLang, type UiLang } from "@/lib/i18n-core";
import { applyLocaleSeo } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: UiLang = isUiLang(rawLocale) ? rawLocale : "en";
  const meta: Metadata = {
    title: "How We Estimate Streamer Income - Streamer Times",
    // 155-char budget (lib/seo.ts MAX_META_DESCRIPTION) — the original
    // sentence ran to 189 and was trimmed on 2026-08-27.
    description:
      "The transparent model behind the estimated monthly income on Streamer Times wiki profiles: measured viewer data, revenue ranges, and what we leave out.",
    alternates: { canonical: "/methodology/income-estimates" },
  };
  return applyLocaleSeo(meta, locale, "/methodology/income-estimates");
}

const LAST_UPDATED = "August 18, 2026";

interface Section {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

const sections: Section[] = [
  {
    heading: "What this number is",
    paragraphs: [
      'Some streamer wiki profiles on Streamer Times show an "Estimated monthly income" entry that cites this page as its source. That figure is not reported by the streamer and not copied from another website: we compute it ourselves, from viewer data we measure directly on Twitch.',
      "It is always a range, always labeled as an estimate, and it describes estimated income from Twitch streaming activity — not a person's total earnings (see “What the estimate does not include” below).",
    ],
  },
  {
    heading: "The data we measure",
    paragraphs: [
      "Streamer Times tracks live streams continuously. For every tracked Twitch channel we record hourly concurrent-viewer samples while the channel is live, plus the duration of each broadcast. The income model uses the most recent eight weeks (56 days), normalized to a 30-day month:",
    ],
    bullets: [
      "Median concurrent viewers (CCV) — the median across all hourly samples in the window. We use the median rather than the average so single raids, collaborations, or subathon spikes do not distort the estimate.",
      "Live hours per month — measured from broadcast VODs, with the count of sampled live hours as a floor for channels that disable VODs.",
    ],
  },
  {
    heading: "The model",
    paragraphs: [
      "Nearly every Twitch revenue stream scales with how many people are watching. The model therefore estimates each component as a range per median concurrent viewer and adds them up:",
    ],
    bullets: [
      "Subscriptions, bits and donations: $2.00–$4.50 per median concurrent viewer per month. This reflects typical subscriber-to-viewer ratios, the revenue split between Twitch and the streamer, and Prime subscriptions.",
      "Advertising: $0.005–$0.015 per viewer-hour (median CCV × live hours), based on typical stream CPMs, ad density, and the streamer's revenue share.",
      "Calibration clamp: the sum of the two components above is kept between $1.50 and $7.00 per median viewer per month. This bracket comes from the only ground truth that has ever been public — the 2021 Twitch payout leak, in which direct payouts clustered around $3–$5 per average concurrent viewer per month.",
      "Sponsorships and brand deals: for channels with at least 500 median concurrent viewers, an additional $1–$6 per median viewer per month, scaled down for channels that stream fewer than 80 hours per month. Sponsorships are the widest unknown in streaming income; this component is deliberately broad and drives most of the upper bound.",
      "Multi-platform streamers: when a channel also streams on YouTube, we widen the upper bound by 25% — we only measure the Twitch side of a simulcast.",
    ],
  },
  {
    heading: "Blending with published estimates",
    paragraphs: [
      "Our research also surfaces income estimates published elsewhere (income-aggregator sites, interviews, press coverage). When such a published range overlaps our measured model, we narrow the displayed figure to the overlap — two independent estimates agreeing is more informative than either alone. When a published figure contradicts our measured data entirely, the measured model wins: third-party income calculators routinely publish invented numbers.",
      "If a streamer has publicly disclosed real payout figures, those beat any model — the wiki article text quotes and cites such disclosures directly.",
    ],
  },
  {
    heading: "When we do not show a number",
    paragraphs: [
      "A missing estimate is a feature, not a gap. We show no model figure when the data cannot support one:",
    ],
    bullets: [
      "Channels with a median below 50 concurrent viewers — below typical affiliate economics, any dollar range would be noise.",
      "Fewer than 10 sampled streams in the eight-week window — too thin to trust the median.",
      "YouTube-only streamers — our viewer sampling covers Twitch, so the model cannot run.",
      "Minors — wiki profiles of streamers under 18 never carry money facts of any kind.",
    ],
  },
  {
    heading: "What the estimate does not include",
    paragraphs: [
      "We can only estimate what correlates with the audience we measure. The figure excludes merchandise sales, exclusive platform contracts, YouTube ad revenue, TikTok, affiliate marketing outside the stream, investments, and any other off-platform income. For large creators these can exceed streaming income — which is exactly why the estimate is labeled as Twitch streaming income and shown as a range.",
    ],
  },
  {
    heading: "Rounding and updates",
    paragraphs: [
      "Ranges are rounded outward to sensible brackets (for example $2.5K–$12K rather than $2,771–$11,852) — a wiki estimate must not fake precision it does not have. Estimates are recomputed roughly monthly from the then-current eight-week window; the “Updated” date on each wiki profile reflects the last change.",
    ],
  },
  {
    heading: "Corrections",
    paragraphs: [
      "If you are a streamer with a wiki profile and believe an estimate misrepresents you — or you simply want it removed — contact us at StreamHub.Privacy@icloud.com. We process correction and removal requests promptly; see also the disclaimer on every wiki profile.",
    ],
  },
];

export default function IncomeMethodologyPage() {
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
        How we estimate streamer income
      </h1>
      <p className="mb-12 text-sm text-text-muted">Last updated: {LAST_UPDATED}</p>

      {sections.map((section) => (
        <div key={section.heading} className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-text-primary">
            {section.heading}
          </h2>
          {section.paragraphs.map((paragraph, i) => (
            <p key={i} className="mb-3 text-sm leading-relaxed text-text-secondary">
              {paragraph}
            </p>
          ))}
          {section.bullets && (
            <ul className="mb-3 list-disc space-y-2 pl-5">
              {section.bullets.map((item, i) => (
                <li key={i} className="text-sm leading-relaxed text-text-secondary">
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}

      <p className="mt-4 text-sm text-text-secondary">
        See also:{" "}
        <Link
          href="/methodology/predictions"
          className="font-medium text-accent-cyan transition-colors hover:text-text-primary"
        >
          how we predict when streamers go live
        </Link>
        .
      </p>

      <footer className="mt-16 border-t border-divider pt-8 text-center text-sm text-text-muted">
        &copy; {new Date().getFullYear()} Streamer Times. All rights reserved.
      </footer>
    </main>
  );
}
