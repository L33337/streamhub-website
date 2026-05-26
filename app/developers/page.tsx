import type { Metadata } from 'next';
import Link from 'next/link';
import { ApiReference } from './components/ApiReference';
import { CodeTabs } from './components/CodeTabs';
import { MobileSectionJump } from './components/MobileSectionJump';
import { RequestAccessForm } from './components/RequestAccessForm';
import { SidebarNav } from './components/SidebarNav';

export const metadata: Metadata = {
  title: 'Partner API — Developer Portal | Streamer Times',
  description:
    'Programmatic access to Streamer Times livestream schedules and AI predictions. Quickstart, authentication, endpoints, tiers, and SDKs for TV magazines and EPG providers.',
  alternates: { canonical: '/developers' },
  openGraph: {
    title: 'Streamer Times Partner API — Developer Portal',
    description:
      'Programmatic access to livestream schedules and AI predictions for TV-guide partners.',
    url: 'https://streamertimes.tv/developers',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

const SUPPORT_EMAIL = 'StreamHub.Privacy@icloud.com';

const SAMPLE_KEY = 'stk_test_…';
const API_BASE_DISPLAY =
  process.env.NEXT_PUBLIC_PARTNER_API_BASE_URL ??
  'https://ypebfgtxythamjwgvoci.supabase.co/functions/v1/partner-api-v1';

export default function DevelopersPage() {
  return (
    <main className="min-h-screen bg-background text-text-primary">
      <TopBar />

      <div className="mx-auto max-w-7xl px-4 md:px-8 lg:px-12 py-12 lg:py-16">
        <div className="grid lg:grid-cols-[1fr_3fr] gap-12">
          <SidebarNav />

          <div className="space-y-24 max-w-3xl">
            <MobileSectionJump />
            <Overview />
            <Quickstart />
            <Authentication />
            <Endpoints />
            <Tiers />
            <RateLimits />
            <SDKs />
            <Support />
          </div>
        </div>
      </div>
    </main>
  );
}

function TopBar() {
  return (
    <header className="border-b border-border-default bg-background/80 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-4 md:px-8 lg:px-12 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="font-semibold text-lg gradient-text hover:opacity-80 transition-opacity"
        >
          StreamerTimes
        </Link>
        <nav className="text-sm flex items-center gap-6">
          <span className="font-mono uppercase text-xs tracking-wider text-accent-cyan">
            Developers
          </span>
          <a
            href="#support"
            className="rounded-lg border border-accent-cyan/40 px-3 py-1.5 text-accent-cyan hover:bg-accent-cyan/10 transition-colors"
          >
            Get API access
          </a>
        </nav>
      </div>
    </header>
  );
}

function Section({
  id,
  title,
  eyebrow,
  children,
}: {
  id: string;
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      {eyebrow && (
        <p className="font-mono uppercase text-xs tracking-wider text-accent-cyan mb-2">
          {eyebrow}
        </p>
      )}
      <h2 className="text-3xl font-semibold mb-4">{title}</h2>
      <div className="space-y-4 text-text-secondary leading-relaxed">{children}</div>
    </section>
  );
}

function Overview() {
  return (
    <Section id="overview" eyebrow="Partner API" title="Build TV-guide products on Streamer Times data">
      <p>
        The Streamer Times Partner API gives TV-magazine editors, EPG providers, and
        streaming aggregators programmatic access to livestream schedules and
        AI-generated predictions across Twitch and YouTube — the same dataset
        powering the consumer Streamer Times app.
      </p>
      <p>
        This page is everything you need to evaluate, integrate, and ship. Reading
        time: ten minutes. Time to your first authenticated API call: under five.
      </p>
      <div className="flex flex-wrap gap-3 pt-2">
        <a
          href="#quickstart"
          className="rounded-lg bg-accent-cyan px-5 py-2.5 font-mono uppercase text-xs tracking-wider text-background hover:opacity-90 transition-opacity"
        >
          Start the quickstart
        </a>
        <a
          href="#support"
          className="rounded-lg border border-border-default px-5 py-2.5 font-mono uppercase text-xs tracking-wider text-text-primary hover:border-accent-cyan/60 transition-colors"
        >
          Request API access
        </a>
      </div>
    </Section>
  );
}

function Quickstart() {
  return (
    <Section id="quickstart" eyebrow="Two snippets" title="Quickstart">
      <p>
        After we issue your API key, two calls are enough to verify everything
        works end-to-end. Replace <code className="text-accent-cyan">{SAMPLE_KEY}…</code>
        with the key you received from us.
      </p>

      <div>
        <h3 className="text-lg font-semibold text-text-primary mt-4 mb-2">
          1. Verify your key
        </h3>
        <p className="mb-3">
          A successful response includes your organization, tier, and granted scopes.
        </p>
        <CodeTabs
          samples={[
            {
              lang: 'curl',
              code: `curl -sS \\
  -H "Authorization: Bearer ${SAMPLE_KEY}" \\
  ${API_BASE_DISPLAY}/v1/_smoke`,
            },
            {
              lang: 'Node',
              code: `const res = await fetch(
  "${API_BASE_DISPLAY}/v1/_smoke",
  { headers: { Authorization: \`Bearer \${process.env.STREAMERTIMES_API_KEY}\` } },
);
console.log(await res.json());`,
            },
            {
              lang: 'Python',
              code: `import os, requests

r = requests.get(
    "${API_BASE_DISPLAY}/v1/_smoke",
    headers={"Authorization": f"Bearer {os.environ['STREAMERTIMES_API_KEY']}"},
)
print(r.json())`,
            },
          ]}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold text-text-primary mt-6 mb-2">
          2. Fetch your first schedules
        </h3>
        <p className="mb-3">
          Returns the next seven days of upcoming + live stream slots, including
          confirmed schedules and AI predictions. See{' '}
          <a className="text-accent-cyan underline" href="#endpoints">
            Endpoints
          </a>{' '}
          for filters and pagination.
        </p>
        <CodeTabs
          samples={[
            {
              lang: 'curl',
              code: `curl -sS \\
  -H "Authorization: Bearer ${SAMPLE_KEY}" \\
  "${API_BASE_DISPLAY}/v1/schedules?limit=5"`,
            },
            {
              lang: 'Node',
              code: `const res = await fetch(
  "${API_BASE_DISPLAY}/v1/schedules?limit=5",
  { headers: { Authorization: \`Bearer \${process.env.STREAMERTIMES_API_KEY}\` } },
);
const { data, pagination } = await res.json();
console.log(\`Got \${data.length} slot(s); next_cursor=\${pagination.next_cursor}\`);`,
            },
            {
              lang: 'Python',
              code: `import os, requests

r = requests.get(
    "${API_BASE_DISPLAY}/v1/schedules",
    params={"limit": 5},
    headers={"Authorization": f"Bearer {os.environ['STREAMERTIMES_API_KEY']}"},
)
payload = r.json()
print(f"Got {len(payload['data'])} slot(s); next_cursor={payload['pagination']['next_cursor']}")`,
            },
          ]}
        />
      </div>
    </Section>
  );
}

function Authentication() {
  return (
    <Section id="authentication" eyebrow="API keys" title="Authentication">
      <p>
        Every request must include an <code className="text-accent-cyan">Authorization: Bearer
        stk_&lt;env&gt;_&lt;random&gt;</code> header. Keys are environment-tagged
        and live until you (or we) revoke them.
      </p>

      <ul className="list-disc list-inside space-y-2">
        <li>
          <strong className="text-text-primary">HTTPS only.</strong>{' '}
          Plain-HTTP requests are rejected before they reach the application layer.
        </li>
        <li>
          <strong className="text-text-primary">Header only.</strong> Keys passed
          via query string return <code className="text-accent-cyan">400 invalid_request</code>{' '}
          — never log keys to URLs or browser history.
        </li>
        <li>
          <strong className="text-text-primary">Prefix scheme.</strong>{' '}
          <code className="text-accent-cyan">stk_test_*</code>,{' '}
          <code className="text-accent-cyan">stk_stage_*</code>, and{' '}
          <code className="text-accent-cyan">stk_live_*</code> identify the
          intended environment. Cross-environment use is rejected.
        </li>
        <li>
          <strong className="text-text-primary">Self-service rotation.</strong>{' '}
          Call <code className="text-accent-cyan">POST /v1/keys</code> at any time
          to issue a replacement key. Your previous key stays valid for 24 hours
          so you can roll deployments without downtime.
        </li>
        <li>
          <strong className="text-text-primary">Leak response.</strong> If a key
          may have leaked, call <code className="text-accent-cyan">POST /v1/keys/&lt;id&gt;/revoke</code>{' '}
          immediately. Subsequent calls with that key return{' '}
          <code className="text-accent-cyan">401 invalid_token</code> within seconds.
        </li>
      </ul>

      <CodeTabs
        samples={[
          {
            lang: 'curl',
            code: `# Rotate the calling key (new plaintext returned ONCE)
curl -sS -X POST \\
  -H "Authorization: Bearer ${SAMPLE_KEY}" \\
  -H "Content-Type: application/json" \\
  -d '{}' \\
  ${API_BASE_DISPLAY}/v1/keys`,
          },
          {
            lang: 'Node',
            code: `// Issue a replacement; persist the new plaintext immediately
const res = await fetch("${API_BASE_DISPLAY}/v1/keys", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.STREAMERTIMES_API_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({}),
});
const { plaintext_key, old_key_grace_until } = await res.json();
// Store \`plaintext_key\` securely. Old key remains valid until old_key_grace_until.`,
          },
          {
            lang: 'Python',
            code: `import os, requests

r = requests.post(
    "${API_BASE_DISPLAY}/v1/keys",
    json={},
    headers={"Authorization": f"Bearer {os.environ['STREAMERTIMES_API_KEY']}"},
)
new = r.json()
# Persist new["plaintext_key"] securely. Old key valid until new["old_key_grace_until"].`,
          },
        ]}
      />
    </Section>
  );
}

const ENDPOINT_TABLE = [
  {
    method: 'GET',
    path: '/v1/_smoke',
    summary: 'Verify auth and echo the resolved key context.',
  },
  {
    method: 'GET',
    path: '/v1/schedules',
    summary: 'Paginated live + upcoming stream slots (real + AI predictions).',
  },
  {
    method: 'GET',
    path: '/v1/streamers',
    summary: 'Paginated streamer directory with platform + language filters.',
  },
  {
    method: 'GET',
    path: '/v1/streamers/{id}',
    summary: 'Single streamer profile by ID.',
  },
  {
    method: 'GET',
    path: '/v1/predictions',
    summary: 'AI-only forecast feed with reasoning. Silver+ tier required.',
  },
  {
    method: 'GET',
    path: '/v1/openapi.json',
    summary: 'Machine-readable OpenAPI 3.1 spec (public, no auth).',
  },
];

function Endpoints() {
  return (
    <Section id="endpoints" eyebrow="Reference" title="Endpoints">
      <p>Six public endpoints. Full schemas and examples below.</p>

      <div className="rounded-lg border border-border-default overflow-hidden mt-2">
        <table className="w-full text-sm">
          <thead className="bg-background-highlight font-mono uppercase text-xs tracking-wider">
            <tr>
              <th className="text-left px-4 py-2 text-text-muted">Method</th>
              <th className="text-left px-4 py-2 text-text-muted">Path</th>
              <th className="text-left px-4 py-2 text-text-muted">Purpose</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {ENDPOINT_TABLE.map((row) => (
              <tr key={row.path}>
                <td className="px-4 py-3 font-mono text-accent-cyan">{row.method}</td>
                <td className="px-4 py-3 font-mono text-text-primary whitespace-nowrap">
                  {row.path}
                </td>
                <td className="px-4 py-3 text-text-secondary">{row.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8">
        <ApiReference />
      </div>
    </Section>
  );
}

const TIER_FEATURES = [
  { feature: 'Schedules feed', bronze: true, silver: true, gold: true },
  { feature: 'Streamers directory', bronze: true, silver: true, gold: true },
  { feature: 'AI predictions inline (with is_predicted flag)', bronze: true, silver: true, gold: true },
  { feature: 'AI reasoning field on each slot', bronze: false, silver: true, gold: true },
  { feature: '/v1/predictions dedicated feed', bronze: false, silver: true, gold: true },
  { feature: 'Realtime live-event webhooks (Phase 2)', bronze: false, silver: false, gold: true },
  { feature: 'Daily bulk JSON export (Phase 3)', bronze: false, silver: false, gold: true },
  { feature: 'Sandbox environment for development', bronze: true, silver: true, gold: true },
  { feature: 'SLA', bronze: 'Best-effort', silver: '99.0 %', gold: '99.5 %' },
];

function Tiers() {
  return (
    <Section id="tiers" eyebrow="Tiers & Pricing" title="Pick the tier that fits">
      <p>
        Three commercial tiers plus a free Sandbox for integration testing.
        During the pilot phase, daily and per-minute quotas are unmetered while
        we calibrate with launch partners. Final numbers ship before public
        rollout — talk to us about expected volume.
      </p>

      <div className="rounded-lg border border-border-default overflow-hidden mt-2">
        <table className="w-full text-sm">
          <thead className="bg-background-highlight font-mono uppercase text-xs tracking-wider">
            <tr>
              <th className="text-left px-4 py-2 text-text-muted">Capability</th>
              <th className="text-center px-4 py-2 text-text-muted">Bronze</th>
              <th className="text-center px-4 py-2 text-text-muted">Silver</th>
              <th className="text-center px-4 py-2 text-text-muted">Gold</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {TIER_FEATURES.map((row) => (
              <tr key={row.feature}>
                <td className="px-4 py-3 text-text-primary">{row.feature}</td>
                <TierCell value={row.bronze} />
                <TierCell value={row.silver} />
                <TierCell value={row.gold} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-text-muted">
        Sandbox accounts run side-by-side with paid tiers — same keys file,
        own usage analytics so test traffic never pollutes billable totals.
      </p>
    </Section>
  );
}

function TierCell({ value }: { value: boolean | string }) {
  if (typeof value === 'string') {
    return <td className="px-4 py-3 text-center font-mono text-accent-cyan text-xs">{value}</td>;
  }
  return (
    <td className="px-4 py-3 text-center">
      {value ? (
        <span className="text-live" aria-label="included">
          ✓
        </span>
      ) : (
        <span className="text-text-muted" aria-label="not included">
          —
        </span>
      )}
    </td>
  );
}

function RateLimits() {
  return (
    <Section id="rate-limits" eyebrow="Headers & retries" title="Rate Limits">
      <p>
        Every successful response carries the rate-limit headers shown below.
        When you hit the limit you receive <code className="text-accent-cyan">429 Too Many
        Requests</code> with a <code className="text-accent-cyan">Retry-After</code> header
        (seconds). We recommend exponential backoff with full jitter starting at the
        value of <code className="text-accent-cyan">Retry-After</code>.
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li>
          <code className="text-accent-cyan">X-Ratelimit-Limit</code> — daily budget
          for the calling key
        </li>
        <li>
          <code className="text-accent-cyan">X-Ratelimit-Remaining</code> — calls
          left in the current rolling 24h window
        </li>
        <li>
          <code className="text-accent-cyan">X-Ratelimit-Reset</code> — Unix
          seconds when the oldest counted request ages out
        </li>
        <li>
          <code className="text-accent-cyan">Retry-After</code> — present only on
          429 responses; seconds to wait before retrying
        </li>
      </ul>
      <p>
        Quota usage is tagged by environment. Test and stage traffic is excluded
        from billable totals, so you can iterate fearlessly during development.
      </p>
    </Section>
  );
}

function SDKs() {
  return (
    <Section id="sdks" eyebrow="Client generation" title="SDKs">
      <p>
        We publish a complete OpenAPI 3.1 spec at{' '}
        <a
          className="text-accent-cyan underline"
          href={`${API_BASE_DISPLAY}/v1/openapi.json`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {API_BASE_DISPLAY}/v1/openapi.json
        </a>
        . Use it with your generator of choice:
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li>
          <strong className="text-text-primary">TypeScript</strong> —{' '}
          <a
            className="text-accent-cyan underline"
            href="https://github.com/openapi-ts/openapi-typescript"
            target="_blank"
            rel="noopener noreferrer"
          >
            openapi-typescript
          </a>{' '}
          + <code className="text-accent-cyan">openapi-fetch</code>
        </li>
        <li>
          <strong className="text-text-primary">Java / Kotlin / Go / Rust</strong> —{' '}
          <a
            className="text-accent-cyan underline"
            href="https://openapi-generator.tech/"
            target="_blank"
            rel="noopener noreferrer"
          >
            openapi-generator
          </a>
        </li>
        <li>
          <strong className="text-text-primary">Python</strong> —{' '}
          <a
            className="text-accent-cyan underline"
            href="https://github.com/koxudaxi/datamodel-code-generator"
            target="_blank"
            rel="noopener noreferrer"
          >
            datamodel-code-generator
          </a>{' '}
          (Pydantic) or{' '}
          <a
            className="text-accent-cyan underline"
            href="https://github.com/openapi-generators/openapi-python-client"
            target="_blank"
            rel="noopener noreferrer"
          >
            openapi-python-client
          </a>
        </li>
      </ul>
      <p className="text-xs text-text-muted">
        Official SDKs on npm and PyPI are on the roadmap once we have launch
        partners; until then, generators give you a fully-typed client in minutes.
      </p>
    </Section>
  );
}

function Support() {
  return (
    <Section id="support" eyebrow="Get in touch" title="Support &amp; access requests">
      <p>
        We hand-onboard partners during the pilot. Drop a few lines about your
        use case and we&apos;ll come back within two business days with sandbox
        credentials.
      </p>

      <div className="grid md:grid-cols-2 gap-6 mt-2">
        <div className="rounded-lg border border-border-default p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            Email
          </h3>
          <p className="text-sm text-text-secondary mb-3">
            For sales, bugs, security disclosures, or anything we missed.
          </p>
          <a
            className="text-accent-cyan underline font-mono text-sm break-all"
            href={`mailto:${SUPPORT_EMAIL}`}
          >
            {SUPPORT_EMAIL}
          </a>
        </div>

        <div className="rounded-lg border border-border-default p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            OpenAPI &amp; status
          </h3>
          <p className="text-sm text-text-secondary mb-3">
            The spec is the contract — point your tools here.
          </p>
          <a
            className="text-accent-cyan underline font-mono text-xs break-all"
            href={`${API_BASE_DISPLAY}/v1/openapi.json`}
            target="_blank"
            rel="noopener noreferrer"
          >
            /v1/openapi.json
          </a>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-text-primary mt-8 mb-3">
        Request API access
      </h3>
      <RequestAccessForm />
    </Section>
  );
}
