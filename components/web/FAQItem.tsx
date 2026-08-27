import Link from 'next/link';
import { ChevronDown } from 'lucide-react';

/** Optional "read more" pointer rendered after an answer (internal link). */
export interface FAQMore {
  href: string;
  label: string;
}

/**
 * Collapsible FAQ entry (native <details>/<summary>). The question is an <h3>
 * so the Q&A is well-structured for search engines; the collapsed answer still
 * ships in the SSR HTML, so it stays crawlable. Mirrors the accordion styling
 * already used on the /app landing page.
 *
 * `more` (2026-08-27): an optional trailing link, e.g. to the prediction
 * methodology page. It sits OUTSIDE the answer paragraph so lexicon answers
 * stay plain strings (byte-identical English, no markup in translations).
 */
export function FAQItem({
  question,
  answer,
  more,
}: {
  question: string;
  answer: string;
  more?: FAQMore;
}) {
  return (
    <details className="group border-b border-divider">
      <summary className="cursor-pointer list-none py-5 [&::-webkit-details-marker]:hidden">
        <h3 className="flex items-center justify-between gap-4 font-medium text-text-primary transition-colors group-hover:text-accent-cyan">
          <span>{question}</span>
          <ChevronDown
            size={18}
            className="shrink-0 text-text-muted transition-transform duration-200 group-open:rotate-180"
          />
        </h3>
      </summary>
      <p className={`text-sm leading-relaxed text-text-secondary ${more ? 'pb-2' : 'pb-5'}`}>
        {answer}
      </p>
      {more && (
        <p className="pb-5 text-sm">
          <Link href={more.href} className="font-medium text-accent-cyan hover:text-text-primary">
            {more.label} →
          </Link>
        </p>
      )}
    </details>
  );
}
