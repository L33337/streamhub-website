export function initialsFromName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function InitialsAvatar({
  name,
  size = 96,
  className = '',
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const initials = initialsFromName(name);
  const fontSize = Math.round(size * 0.4);
  return (
    <div
      className={`inline-flex items-center justify-center rounded-full bg-background-highlight border-2 border-accent-cyan/40 font-bold text-text-primary glow-cyan ${className}`}
      style={{ width: size, height: size, fontSize }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}
