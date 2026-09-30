import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  LOW: "bg-risk-low/15 text-risk-low ring-risk-low/30",
  MEDIUM: "bg-risk-medium/15 text-risk-medium ring-risk-medium/30",
  HIGH: "bg-risk-high/15 text-risk-high ring-risk-high/30",
};

export function RiskBadge({
  category,
  className,
  size = "sm",
}: {
  category: string;
  className?: string;
  size?: "sm" | "lg";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold tracking-wide ring-1 ring-inset",
        size === "lg" ? "px-4 py-1.5 text-sm" : "px-2.5 py-0.5 text-[11px]",
        STYLES[category] ?? "bg-muted text-muted-foreground ring-border",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {category}
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="panel p-5">
      <p className="label-caps">{label}</p>
      <p className="stat-value mt-2 text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
