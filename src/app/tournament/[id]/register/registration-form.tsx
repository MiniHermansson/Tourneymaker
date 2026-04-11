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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { LOL_ROLES, LOL_ROLE_LABELS, type LolRole } from "@/lib/constants";
import type { Database } from "@/lib/types/database";

type Registration = Database["public"]["Tables"]["registrations"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface RegistrationFormProps {
  tournamentId: string;
  userId: string;
  existingRegistration: Registration | null;
  isRegistrationOpen: boolean;
  profile: Profile;
}

export function RegistrationForm({
  tournamentId,
  userId,
  existingRegistration,
  isRegistrationOpen,
  profile,
}: RegistrationFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [mainRole, setMainRole] = useState<LolRole>(
    (existingRegistration?.main_role as LolRole) ?? "mid"
  );
  const [secondaryRole, setSecondaryRole] = useState<LolRole>(
    (existingRegistration?.secondary_role as LolRole) ?? "support"
  );
  const [wantsCaptain, setWantsCaptain] = useState(
    existingRegistration?.wants_captain ?? false
  );
  const [willingSub, setWillingSub] = useState(
    existingRegistration?.willing_substitute ?? false
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mainRole === secondaryRole && mainRole !== "fill") {
      setError("Main and secondary roles must be different (unless Fill)");
      return;
    }

    setLoading(true);

    const registrationData = {
      tournament_id: tournamentId,
      user_id: userId,
      main_role: mainRole,
      secondary_role: mainRole === "fill" ? "fill" : secondaryRole,
      wants_captain: wantsCaptain,
      willing_substitute: willingSub,
      rank_at_registration: profile.current_rank,
      rank_tier_at_registration: profile.current_rank_tier,
    };

    if (existingRegistration) {
      const { error: updateError } = await supabase
        .from("registrations")
        .update(registrationData)
        .eq("id", existingRegistration.id);

      if (updateError) {
        setError("Failed to update registration.");
        setLoading(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase
        .from("registrations")
        .insert(registrationData);

      if (insertError) {
        setError("Failed to register. Registration may be closed.");
        setLoading(false);
        return;
      }
    }

    router.refresh();
    setLoading(false);
  };

  const handleUnregister = async () => {
    if (!existingRegistration) return;
    setLoading(true);

    // Players can't delete their own registration via RLS - would need organizer
    // For now, we'll use the API
    const { error: deleteError } = await supabase
      .from("registrations")
      .delete()
      .eq("id", existingRegistration.id);

    if (deleteError) {
      setError("Failed to unregister. Contact an organizer.");
    }

    router.refresh();
    setLoading(false);
  };

  if (!isRegistrationOpen && !existingRegistration) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">
            Registration is currently closed.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {existingRegistration ? "Your Registration" : "Register"}
        </CardTitle>
        <CardDescription>
          {existingRegistration
            ? "You are registered. You can update your preferences below."
            : "Sign up for this tournament. Choose your preferred roles."}
        </CardDescription>
        {existingRegistration && (
          <Badge variant="secondary" className="w-fit">
            Registered
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Main Role</Label>
              <Select
                value={mainRole}
                onValueChange={(v) => setMainRole(v as LolRole)}
                disabled={!isRegistrationOpen}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOL_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {LOL_ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {mainRole !== "fill" && (
              <div className="space-y-2">
                <Label>Secondary Role</Label>
                <Select
                  value={secondaryRole}
                  onValueChange={(v) => setSecondaryRole(v as LolRole)}
                  disabled={!isRegistrationOpen}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOL_ROLES.filter((r) => r !== mainRole).map((role) => (
                      <SelectItem key={role} value={role}>
                        {LOL_ROLE_LABELS[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="captain">Want to be a captain?</Label>
              <p className="text-xs text-muted-foreground">
                Captains draft their own team in captains draft mode
              </p>
            </div>
            <Switch
              id="captain"
              checked={wantsCaptain}
              onCheckedChange={setWantsCaptain}
              disabled={!isRegistrationOpen}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="substitute">Willing to be a substitute?</Label>
              <p className="text-xs text-muted-foreground">
                If not drafted, join the substitute pool for teams to use
              </p>
            </div>
            <Switch
              id="substitute"
              checked={willingSub}
              onCheckedChange={setWillingSub}
              disabled={!isRegistrationOpen}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {isRegistrationOpen && (
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading
                  ? "Saving..."
                  : existingRegistration
                    ? "Update Registration"
                    : "Register"}
              </Button>
              {existingRegistration && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleUnregister}
                  disabled={loading}
                >
                  Unregister
                </Button>
              )}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
