import Image from "next/image";
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
        "inline-flex items-center gap-1 text-xs font-semibold",
        colors.text,
        className
      )}
    >
      <Image
        src={`/ranks/${rank}.png`}
        alt={label}
        width={20}
        height={20}
        className="shrink-0"
      />
      {label}
      {tier && rank !== "unranked" ? ` ${tier}` : ""}
    </span>
  );
}
