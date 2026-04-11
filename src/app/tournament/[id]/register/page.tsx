import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RegistrationForm } from "./registration-form";
import type { TournamentStatus, LolRole } from "@/lib/constants";
import { RoleBadge } from "@/components/role-badge";

interface RegisterPageProps {
  params: Promise<{ id: string }>;
}

export default async function RegisterPage({ params }: RegisterPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", id)
    .single();

  if (!tournament) redirect("/");

  const status = tournament.status as TournamentStatus;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile?.lol_gamertag) redirect("/onboarding");

  // Check existing registration
  const { data: existing } = await supabase
    .from("registrations")
    .select("*")
    .eq("tournament_id", id)
    .eq("user_id", user.id)
    .single();

  // Get all registrations for display
  const { data: registrations } = await supabase
    .from("registrations")
    .select("*, profiles(*)")
    .eq("tournament_id", id)
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <RegistrationForm
        tournamentId={id}
        userId={user.id}
        existingRegistration={existing}
        isRegistrationOpen={status === "registration"}
        profile={profile}
      />

      {registrations && registrations.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">
            Registered Players ({registrations.length})
          </h2>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium">#</th>
                  <th className="px-4 py-2 text-left font-medium">Player</th>
                  <th className="px-4 py-2 text-left font-medium">Main Role</th>
                  <th className="px-4 py-2 text-left font-medium">Secondary</th>
                  <th className="px-4 py-2 text-left font-medium">Captain</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((reg, i) => {
                  const p = reg.profiles as Record<string, unknown>;
                  return (
                    <tr key={reg.id} className="border-b">
                      <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-2 font-medium">
                        {(p?.discord_username as string) ?? "Unknown"}
                      </td>
                      <td className="px-4 py-2">
                        <RoleBadge role={reg.main_role as LolRole} />
                      </td>
                      <td className="px-4 py-2">
                        <RoleBadge role={reg.secondary_role as LolRole} />
                      </td>
                      <td className="px-4 py-2">
                        {reg.wants_captain ? "Yes" : "No"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
