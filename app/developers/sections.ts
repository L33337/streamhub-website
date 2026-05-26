// Single source of truth for the /developers page sections.
// SidebarNav and the mobile section-jump dropdown both import this list so
// adding a section is a one-line change.

export interface DocSection {
  id: string;
  label: string;
}

export const DOC_SECTIONS: DocSection[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'quickstart', label: 'Quickstart' },
  { id: 'authentication', label: 'Authentication' },
  { id: 'endpoints', label: 'Endpoints' },
  { id: 'tiers', label: 'Tiers & Pricing' },
  { id: 'rate-limits', label: 'Rate Limits' },
  { id: 'sdks', label: 'SDKs' },
  { id: 'support', label: 'Support' },
];
