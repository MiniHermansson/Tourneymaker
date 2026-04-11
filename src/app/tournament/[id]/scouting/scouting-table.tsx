"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExternalLink, ArrowUpDown } from "lucide-react";
import { LOL_ROLES, LOL_ROLE_LABELS, type LolRole, type LolRank } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { RankBadge } from "@/components/rank-badge";
import { RoleBadge } from "@/components/role-badge";

interface Registration {
  id: string;
  user_id: string;
  main_role: string;
  secondary_role: string;
  rank_at_registration: string | null;
  rank_tier_at_registration: string | null;
  wants_captain: boolean;
  willing_substitute: boolean;
  profiles: Record<string, unknown>;
}

interface PlayerValue {
  user_id: string;
  value: number;
}

interface ScoutingTableProps {
  registrations: Registration[];
  playerValues: PlayerValue[];
  draftedUserIds: Set<string>;
  minValue: number;
  maxValue: number;
}

type SortField = "name" | "role" | "rank" | "value";
type SortDir = "asc" | "desc";

export function ScoutingTable({
  registrations,
  playerValues,
  draftedUserIds,
  minValue,
  maxValue,
}: ScoutingTableProps) {
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [valueMin, setValueMin] = useState<string>("");
  const [valueMax, setValueMax] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showDrafted, setShowDrafted] = useState(false);
  const [sortField, setSortField] = useState<SortField>("value");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const valueMap = useMemo(
    () => new Map(playerValues.map((pv) => [pv.user_id, pv.value])),
    [playerValues]
  );

  const rankOrder = [
    "unranked", "iron", "bronze", "silver", "gold",
    "platinum", "emerald", "diamond", "master", "grandmaster", "challenger",
  ];

  const filtered = useMemo(() => {
    return registrations
      .filter((reg) => {
        if (!showDrafted && draftedUserIds.has(reg.user_id)) return false;

        if (roleFilter !== "all") {
          if (reg.main_role !== roleFilter && reg.secondary_role !== roleFilter)
            return false;
        }

        const val = valueMap.get(reg.user_id) ?? 0;
        if (valueMin && val < Number(valueMin)) return false;
        if (valueMax && val > Number(valueMax)) return false;

        if (searchQuery) {
          const name = ((reg.profiles?.discord_username as string) ?? "").toLowerCase();
          const gamertag = ((reg.profiles?.lol_gamertag as string) ?? "").toLowerCase();
          const q = searchQuery.toLowerCase();
          if (!name.includes(q) && !gamertag.includes(q)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const dir = sortDir === "asc" ? 1 : -1;
        switch (sortField) {
          case "name": {
            const nameA = (a.profiles?.discord_username as string) ?? "";
            const nameB = (b.profiles?.discord_username as string) ?? "";
            return nameA.localeCompare(nameB) * dir;
          }
          case "role":
            return a.main_role.localeCompare(b.main_role) * dir;
          case "rank": {
            const rankA = rankOrder.indexOf(a.rank_at_registration ?? "unranked");
            const rankB = rankOrder.indexOf(b.rank_at_registration ?? "unranked");
            return (rankA - rankB) * dir;
          }
          case "value": {
            const valA = valueMap.get(a.user_id) ?? 0;
            const valB = valueMap.get(b.user_id) ?? 0;
            return (valA - valB) * dir;
          }
          default:
            return 0;
        }
      });
  }, [registrations, roleFilter, valueMin, valueMax, searchQuery, showDrafted, draftedUserIds, sortField, sortDir, valueMap, rankOrder]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search player..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-48"
        />
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v ?? "all")}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Filter role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {LOL_ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {LOL_ROLE_LABELS[role]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          <Input
            placeholder={`Min (${minValue})`}
            type="number"
            min={minValue}
            max={maxValue}
            value={valueMin}
            onChange={(e) => setValueMin(e.target.value)}
            className="w-20"
          />
          <span className="text-muted-foreground">-</span>
          <Input
            placeholder={`Max (${maxValue})`}
            type="number"
            min={minValue}
            max={maxValue}
            value={valueMax}
            onChange={(e) => setValueMax(e.target.value)}
            className="w-20"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDrafted(!showDrafted)}
        >
          {showDrafted ? "Hide Drafted" : "Show Drafted"}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} player{filtered.length !== 1 ? "s" : ""}
      </p>

      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2 text-left">
                <button
                  className="font-medium inline-flex items-center gap-1"
                  onClick={() => toggleSort("name")}
                >
                  Player <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-3 py-2 text-left">
                <button
                  className="font-medium inline-flex items-center gap-1"
                  onClick={() => toggleSort("role")}
                >
                  Roles <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-3 py-2 text-left">
                <button
                  className="font-medium inline-flex items-center gap-1"
                  onClick={() => toggleSort("rank")}
                >
                  Rank <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-3 py-2 text-left">op.gg</th>
              <th className="px-3 py-2 text-left">
                <button
                  className="font-medium inline-flex items-center gap-1"
                  onClick={() => toggleSort("value")}
                >
                  Value <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-3 py-2 text-left">Captain</th>
              <th className="px-3 py-2 text-left">Sub</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((reg) => {
              const p = reg.profiles;
              const opggUrl = p?.opgg_url as string | null;
              const isDrafted = draftedUserIds.has(reg.user_id);
              const value = valueMap.get(reg.user_id) ?? 0;

              return (
                <tr
                  key={reg.id}
                  className={`border-b ${isDrafted ? "opacity-40" : ""}`}
                >
                  <td className="px-3 py-2 font-medium">
                    <div>
                      {(p?.discord_username as string) ?? "Unknown"}
                      {(p?.lol_gamertag as string) && (
                        <span className="text-xs text-muted-foreground ml-1">
                          ({p.lol_gamertag as string})
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <RoleBadge role={reg.main_role as LolRole} />
                      {reg.secondary_role !== reg.main_role && (
                        <RoleBadge role={reg.secondary_role as LolRole} />
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <RankBadge
                      rank={(reg.rank_at_registration as LolRank) ?? "unranked"}
                      tier={reg.rank_tier_at_registration}
                    />
                  </td>
                  <td className="px-3 py-2">
                    {opggUrl && (
                      <a
                        href={opggUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        op.gg
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <Badge
                      variant={value >= 5 ? "default" : value >= 3 ? "secondary" : "outline"}
                    >
                      {value}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    {reg.wants_captain ? (
                      <Badge variant="secondary" className="text-xs">Yes</Badge>
                    ) : "-"}
                  </td>
                  <td className="px-3 py-2">
                    {reg.willing_substitute ? (
                      <Badge variant="outline" className="text-xs">Yes</Badge>
                    ) : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
