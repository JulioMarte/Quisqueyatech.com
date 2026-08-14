import { Bot, Code2, HeartPulse, Workflow } from "lucide-react";
import { MarketingCard } from "./MarketingCard";

interface Props {
  points: readonly (readonly [string, string])[];
  fourColumns?: boolean;
}

const icons = [Workflow, Bot, Code2, HeartPulse] as const;

export function MarketingGrid({ points, fourColumns = false }: Props) {
  return (
    <div className={["marketing-grid", "motion-stagger", fourColumns ? "four" : ""].filter(Boolean).join(" ")}>
      {points.map(([title, body], index) => {
        const Icon = icons[index % icons.length];
        return <MarketingCard key={title} title={title} body={body} icon={Icon} />;
      })}
    </div>
  );
}
