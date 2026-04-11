import { cn } from "@/lib/utils";
import {
  LOL_ROLE_COLORS,
  LOL_ROLE_LABELS,
  type LolRole,
} from "@/lib/constants";

export function RoleBadge({
  role,
  className,
}: {
  role: LolRole;
  className?: string;
}) {
  const colors = LOL_ROLE_COLORS[role];
  const label = LOL_ROLE_LABELS[role];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        colors.bg,
        colors.text,
        className
      )}
    >
      {label}
    </span>
  );
}
