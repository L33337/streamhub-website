import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy - StreamHub",
  description: "StreamHub Privacy Policy. Learn how we collect, use, and protect your information.",
};

const sections = [
  {
    heading: "1. Introduction",
    paragraphs: [
      'StreamHub ("we", "us", "our") operates the StreamHub mobile application (the "App"). This Privacy Policy explains how we collect, use, and protect your information when you use our App.',
      "By using the App, you agree to the collection and use of information in accordance with this policy.",
    ],
  },
  {
    heading: "2. Information We Collect",
    paragraphs: [
      "Automatically Collected: When you first open the App, an anonymous account is created automatically. This account has a unique identifier but contains no personal information.",
      "Information You Provide: If you choose to create an account, we collect your email address and password. We also store your favorite streamers (which channels you choose to follow).",
    ],
  },
  {
    heading: "3. Information We Do Not Collect",
    paragraphs: [
      "We do not collect your location, contacts, photos, payment information, browsing history, or any other personal data beyond what is described above. We do not use tracking or advertising SDKs.",
    ],
  },
  {
    heading: "4. How We Use Your Information",
    paragraphs: [
      "We use your information to provide and improve the App, including: displaying personalized stream schedules based on your favorites, authenticating your account, and generating AI-powered stream predictions (processed server-side only).",
    ],
  },
  {
    heading: "5. Third-Party Services",
    paragraphs: [
      "The App uses the following third-party services to provide its functionality:",
      "Supabase: Authentication and database hosting (supabase.com/privacy). Your account data and favorites are stored on Supabase servers.",
      "Twitch API: We fetch publicly available stream schedules and live status from Twitch. Your personal data is not shared with Twitch.",
      "YouTube API: We fetch publicly available stream data and video transcripts from YouTube. Your personal data is not shared with YouTube. YouTube API Services are used in accordance with Google Privacy Policy (policies.google.com/privacy).",
      "Anthropic Claude AI: We use AI to generate stream predictions. Only public streamer data (schedules, stream history) is sent to this service. Your personal data is never shared with Anthropic.",
    ],
  },
  {
    heading: "6. Data Storage and Security",
    paragraphs: [
      "Your data is stored securely on Supabase cloud servers. Authentication tokens are managed by Supabase Auth with industry-standard encryption. We do not sell, trade, or otherwise transfer your personal information to third parties.",
    ],
  },
  {
    heading: "7. Data Retention",
    paragraphs: [
      "Anonymous accounts: Data is retained until the account is deleted or becomes inactive.",
      "Email accounts: Data is retained until you request deletion of your account.",
      "Stream predictions and history: Retained for up to 14 days for analysis purposes, then automatically deleted.",
    ],
  },
  {
    heading: "8. Your Rights",
    paragraphs: [
      "You have the right to: access the personal data we hold about you, request deletion of your account and all associated data, and export your data. To exercise any of these rights, please contact us at the email address below.",
    ],
  },
  {
    heading: "9. Children's Privacy",
    paragraphs: [
      "The App is not directed at children under the age of 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal data, please contact us.",
    ],
  },
  {
    heading: "10. Changes to This Policy",
    paragraphs: [
      'We may update this Privacy Policy from time to time. Changes will be reflected by updating the "Last updated" date at the top of this page. We encourage you to review this policy periodically.',
    ],
  },
  {
    heading: "11. Contact Us",
    paragraphs: [
      "If you have any questions about this Privacy Policy, please contact us at: StreamHub.Privacy@icloud.com",
    ],
  },
];

export default function PrivacyPolicy() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-accent-cyan"
      >
        <ArrowLeft size={16} />
        Back to StreamHub
      </Link>

      <h1 className="mb-2 text-3xl font-bold text-text-primary">
        Privacy Policy
      </h1>
      <p className="mb-12 text-sm text-text-muted">
        Last updated: February 21, 2026
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
        &copy; {new Date().getFullYear()} StreamHub. All rights reserved.
      </footer>
    </main>
  );
}
