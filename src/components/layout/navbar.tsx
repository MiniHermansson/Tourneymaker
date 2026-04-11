import Link from "next/link";
import { Trophy } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserNav } from "@/components/layout/user-nav";
import { createClient } from "@/lib/supabase/server";

export async function Navbar() {
  let user = null;
  let profile = null;

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;

    if (user) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      profile = profileData;
    }
  } catch {
    // Supabase not configured yet - render navbar without auth
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Trophy className="h-5 w-5" />
          <span>TourneyMaker</span>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {user && profile ? (
            <UserNav profile={profile} />
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
