import { ChevronDown } from 'lucide-react';

/**
 * Collapsible FAQ entry (native <details>/<summary>). The question is an <h3>
 * so the Q&A is well-structured for search engines; the collapsed answer still
 * ships in the SSR HTML, so it stays crawlable. Mirrors the accordion styling
 * already used on the /app landing page.
 */
export function FAQItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
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
      <p className="pb-5 text-sm leading-relaxed text-text-secondary">{answer}</p>
    </details>
  );
}
