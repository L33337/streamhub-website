import Link from 'next/link';
import { SettingsSection } from './SettingsSection';

const LINKS: Array<{ href: string; label: string; external?: boolean }> = [
  { href: '/privacy-policy', label: 'Privacy Policy' },
  { href: '/terms-of-service', label: 'Terms of Service' },
  { href: '/impressum', label: 'Impressum' },
  { href: '/support', label: 'Support' },
];

export function LegalLinksSection() {
  return (
    <SettingsSection title="Legal & Support">
      <ul className="-mx-1 flex flex-wrap gap-2 text-sm">
        {LINKS.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="inline-flex h-9 items-center rounded-lg border border-border-default bg-background-elevated px-3 font-medium text-text-secondary hover:border-accent-cyan/40 hover:text-text-primary transition-colors"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </SettingsSection>
  );
}
