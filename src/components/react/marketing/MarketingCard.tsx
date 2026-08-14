import type { LucideIcon } from "lucide-react";

interface Props {
  title: string;
  body: string;
  icon: LucideIcon;
}

export function MarketingCard({ title, body, icon: Icon }: Props) {
  return (
    <article className="marketing-card motion-item">
      <span className="marketing-icon"><Icon aria-hidden="true" /></span>
      <h2>{title}</h2>
      <p>{body}</p>
    </article>
  );
}
