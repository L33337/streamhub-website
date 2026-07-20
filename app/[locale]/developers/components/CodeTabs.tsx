'use client';

import { useState } from 'react';

export type CodeLanguage = 'curl' | 'Node' | 'Python';

export interface CodeSample {
  lang: CodeLanguage;
  code: string;
}

/**
 * Tabbed code-sample block. Intentionally minimal — no syntax highlighter
 * dependency. Tailwind handles the dark-themed `<pre>`. Click-to-copy is
 * a "nice to have" we can add via navigator.clipboard later.
 */
export function CodeTabs({ samples }: { samples: CodeSample[] }) {
  const [active, setActive] = useState<CodeLanguage>(samples[0].lang);
  const current = samples.find((s) => s.lang === active) ?? samples[0];

  return (
    <div className="rounded-lg border border-border-default bg-background-elevated overflow-hidden">
      <div
        role="tablist"
        className="flex border-b border-border-default bg-background-highlight text-sm"
      >
        {samples.map((s) => {
          const isActive = s.lang === active;
          return (
            <button
              key={s.lang}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(s.lang)}
              className={[
                'px-4 py-2 font-mono transition-colors',
                isActive
                  ? 'text-accent-cyan border-b-2 border-accent-cyan -mb-px'
                  : 'text-text-secondary hover:text-text-primary',
              ].join(' ')}
            >
              {s.lang}
            </button>
          );
        })}
      </div>
      <pre className="overflow-x-auto p-4 text-sm leading-relaxed">
        <code className="font-mono text-text-primary">{current.code}</code>
      </pre>
    </div>
  );
}
