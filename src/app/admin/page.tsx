import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminUserList } from "./admin-user-list";
import { RegisterTestPlayers } from "./register-test-players";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_organizer")
    .eq("id", user.id)
    .single();

  if (!profile?.is_organizer) redirect("/");

  const [{ data: users }, { data: tournaments }] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("tournaments")
      .select("id, name, status")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>
      <div className="space-y-6">
        <RegisterTestPlayers tournaments={tournaments ?? []} />
        <AdminUserList users={users ?? []} currentUserId={user.id} />
      </div>
    </div>
  );
}
