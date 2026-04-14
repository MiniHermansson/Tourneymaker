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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { RankBadge } from "@/components/rank-badge";
import { type LolRank } from "@/lib/constants";
import type { Database } from "@/lib/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export function AdminUserList({
  users,
  currentUserId,
}: {
  users: Profile[];
  currentUserId: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [updating, setUpdating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

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

  const deleteUser = async (userId: string) => {
    setDeleting(userId);
    const response = await fetch("/api/admin/delete-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (response.ok) {
      router.refresh();
    }
    setDeleting(null);
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
            <TableHead></TableHead>
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
              <TableCell>
                {user.id !== currentUserId && (
                  <Dialog>
                    <DialogTrigger
                      render={
                        <Button variant="destructive" size="sm" />
                      }
                    >
                      Delete
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Delete user</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to delete{" "}
                          <strong>{user.discord_username}</strong>? This will
                          permanently remove their account and all associated
                          data.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <DialogClose
                          render={<Button variant="outline" />}
                        >
                          Cancel
                        </DialogClose>
                        <Button
                          variant="destructive"
                          onClick={() => deleteUser(user.id)}
                          disabled={deleting === user.id}
                        >
                          {deleting === user.id ? "Deleting..." : "Delete"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
