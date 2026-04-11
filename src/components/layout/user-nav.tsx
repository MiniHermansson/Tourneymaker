"use client";

import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

interface Profile {
  id: string;
  discord_username: string;
  discord_avatar_url: string | null;
  lol_gamertag: string | null;
  is_organizer: boolean;
}

export function UserNav({ profile }: { profile: Profile }) {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative h-8 w-8 rounded-full cursor-pointer">
        <Avatar className="h-8 w-8">
          <AvatarImage
            src={profile.discord_avatar_url ?? undefined}
            alt={profile.discord_username}
          />
          <AvatarFallback>
            {profile.discord_username.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium leading-none">
                  {profile.discord_username}
                </p>
                {profile.is_organizer && (
                  <Badge variant="secondary" className="text-xs">
                    Organizer
                  </Badge>
                )}
              </div>
              {profile.lol_gamertag && (
                <p className="text-xs leading-none text-muted-foreground">
                  {profile.lol_gamertag}
                </p>
              )}
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {profile.is_organizer && (
          <DropdownMenuItem onClick={() => router.push("/dashboard")}>
            Dashboard
          </DropdownMenuItem>
        )}
        {profile.is_organizer && (
          <DropdownMenuItem onClick={() => router.push("/admin")}>
            Admin Panel
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => router.push("/profile")}>
          Profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
