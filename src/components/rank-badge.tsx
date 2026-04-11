import { cn } from "@/lib/utils";
import {
  LOL_RANK_COLORS,
  LOL_RANK_LABELS,
  type LolRank,
} from "@/lib/constants";

export function RankBadge({
  rank,
  tier,
  className,
}: {
  rank: LolRank;
  tier?: string | null;
  className?: string;
}) {
  const colors = LOL_RANK_COLORS[rank];
  const label = LOL_RANK_LABELS[rank];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
        colors.bg,
        colors.text,
        className
      )}
    >
      {label}
      {tier && rank !== "unranked" ? ` ${tier}` : ""}
    </span>
  );
}
