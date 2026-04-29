import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Mail, MessageCircle, Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "Support - Streamer Times",
  description: "Get help with Streamer Times. Contact us for support, bug reports, or feedback.",
};

export default function Support() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-accent-cyan"
      >
        <ArrowLeft size={16} />
        Back to Streamer Times
      </Link>

      <h1 className="mb-2 text-3xl font-bold text-text-primary">Support</h1>
      <p className="mb-12 text-text-secondary">
        Need help with Streamer Times? We&apos;re here for you.
      </p>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Contact Card */}
        <div className="rounded-xl border border-border-default bg-background-elevated p-6">
          <div className="mb-4 inline-flex rounded-lg bg-background-highlight p-3 text-accent-cyan">
            <Mail size={24} strokeWidth={1.5} />
          </div>
          <h2 className="mb-2 text-lg font-semibold text-text-primary">
            Contact Us
          </h2>
          <p className="mb-4 text-sm text-text-secondary">
            For bug reports, feature requests, or general questions.
          </p>
          <a
            href="mailto:StreamHub.Privacy@icloud.com"
            className="text-sm font-medium text-accent-cyan transition-colors hover:text-accent-cyan-muted"
          >
            StreamHub.Privacy@icloud.com
          </a>
        </div>

        {/* Privacy Card */}
        <div className="rounded-xl border border-border-default bg-background-elevated p-6">
          <div className="mb-4 inline-flex rounded-lg bg-background-highlight p-3 text-accent-cyan">
            <Shield size={24} strokeWidth={1.5} />
          </div>
          <h2 className="mb-2 text-lg font-semibold text-text-primary">
            Privacy & Data
          </h2>
          <p className="mb-4 text-sm text-text-secondary">
            Request account deletion or data export.
          </p>
          <p className="text-sm text-text-secondary">
            You can delete your account directly in the app via Settings. For
            data export requests, email us.
          </p>
        </div>
      </div>

      {/* FAQ */}
      <section className="mt-16">
        <h2 className="mb-8 text-2xl font-bold text-text-primary">
          Frequently Asked Questions
        </h2>

        <div className="space-y-6">
          {[
            {
              q: "Do I need an account to use Streamer Times?",
              a: "No. Streamer Times creates an anonymous session when you first open the app. You can browse all streams and use all features without creating an account. Creating an account lets you sync favorites across devices.",
            },
            {
              q: "How accurate are the AI predictions?",
              a: "Our AI analyzes streaming patterns over the past 14 days to predict schedules. Accuracy depends on how consistent a streamer's schedule is. Predictions include a confidence level (high, medium, low) so you know how reliable they are.",
            },
            {
              q: "Which streamers are available?",
              a: "You can add any Twitch or YouTube streamer to your guide. Use the search feature to find streamers by name. Streamer Times will automatically set up real-time notifications for them.",
            },
            {
              q: "How do I delete my account?",
              a: "Open the app, go to Settings, and tap \"Delete Account\". This permanently removes your email, favorites, and all associated data. A new anonymous session will be created automatically.",
            },
            {
              q: "Is Streamer Times free?",
              a: "Yes, Streamer Times is free to download and use. The app includes ad banners to support development.",
            },
            {
              q: "The app shows no streams. What should I do?",
              a: "Make sure you have an internet connection. Try pulling down to refresh. If the problem persists, the service may be temporarily unavailable — please try again later.",
            },
          ].map((item) => (
            <div
              key={item.q}
              className="rounded-xl border border-border-default bg-background-elevated p-6"
            >
              <div className="mb-2 flex items-start gap-3">
                <MessageCircle
                  size={18}
                  strokeWidth={1.5}
                  className="mt-0.5 shrink-0 text-accent-cyan"
                />
                <h3 className="text-base font-semibold text-text-primary">
                  {item.q}
                </h3>
              </div>
              <p className="ml-[30px] text-sm leading-relaxed text-text-secondary">
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-16 border-t border-divider pt-8 text-center text-sm text-text-muted">
        &copy; {new Date().getFullYear()} Streamer Times. All rights reserved.
      </footer>
    </main>
  );
}
