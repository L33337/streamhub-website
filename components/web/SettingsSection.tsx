interface Props {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function SettingsSection({ title, description, children }: Props) {
  return (
    <section className="mt-6 rounded-xl border border-border-default bg-background-elevated">
      <header className="border-b border-divider px-4 py-3 md:px-5">
        <h2 className="text-base font-semibold text-text-primary md:text-lg">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm text-text-muted">{description}</p>
        ) : null}
      </header>
      <div className="px-4 py-4 md:px-5">{children}</div>
    </section>
  );
}
