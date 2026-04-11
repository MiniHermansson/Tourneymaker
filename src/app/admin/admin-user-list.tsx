"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { RankBadge } from "@/components/rank-badge";
import { type LolRank } from "@/lib/constants";
import type { Database } from "@/lib/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export function AdminUserList({ users }: { users: Profile[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [updating, setUpdating] = useState<string | null>(null);

  const toggleOrganizer = async (userId: string, currentValue: boolean) => {
    setUpdating(userId);

    // Use a server action or API route for admin operations
    // For now, this will work if the user is an organizer updating via service role
    const response = await fetch("/api/admin/toggle-organizer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, isOrganizer: !currentValue }),
    });

    if (response.ok) {
      router.refresh();
    }

    setUpdating(null);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Discord Username</TableHead>
            <TableHead>LoL Gamertag</TableHead>
            <TableHead>Rank</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead>Organizer</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">
                {user.discord_username}
              </TableCell>
              <TableCell>{user.lol_gamertag ?? "Not set"}</TableCell>
              <TableCell>
                <RankBadge
                  rank={(user.current_rank as LolRank) ?? "unranked"}
                  tier={user.current_rank_tier}
                />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(user.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <Switch
                  checked={user.is_organizer}
                  onCheckedChange={() =>
                    toggleOrganizer(user.id, user.is_organizer)
                  }
                  disabled={updating === user.id}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
