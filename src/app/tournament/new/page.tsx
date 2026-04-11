"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function NewTournamentPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const format = formData.get("format") as string;

    if (!name.trim()) {
      setError("Tournament name is required");
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data, error: insertError } = await supabase
      .from("tournaments")
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        format,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      setError("Failed to create tournament. Make sure you have organizer permissions.");
      setLoading(false);
      return;
    }

    router.push(`/tournament/${data.id}`);
  };

  return (
    <div className="container mx-auto max-w-lg py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Create Tournament</h1>

      <Card>
        <CardHeader>
          <CardTitle>Tournament Details</CardTitle>
          <CardDescription>
            Set up the basic info for your tournament. You can configure groups,
            playoffs, and more after registration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tournament Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g., Season 1 Championship"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Describe your tournament..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="format">Team Formation</Label>
              <Select name="format" defaultValue="captains_draft">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="captains_draft">
                    Captains Draft
                  </SelectItem>
                  <SelectItem value="premade_teams">
                    Premade Teams
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Captains Draft: Players sign up individually, captains draft
                their teams. Premade Teams: Players sign up as pre-formed teams.
              </p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Tournament"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
