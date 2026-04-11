-- Tournament state machine
CREATE TYPE tournament_status AS ENUM (
  'setup',
  'registration',
  'planning',
  'scouting',
  'captains_draft',
  'team_setup',
  'group_stage',
  'playoff',
  'results',
  'archived'
);

-- Tournament format
CREATE TYPE tournament_format AS ENUM (
  'premade_teams',
  'captains_draft'
);

-- LoL roles
CREATE TYPE lol_role AS ENUM (
  'top',
  'jungle',
  'mid',
  'adc',
  'support',
  'fill'
);

-- Best-of format
CREATE TYPE bo_format AS ENUM ('bo1', 'bo3', 'bo5');

-- Playoff format
CREATE TYPE playoff_format AS ENUM ('single_elimination', 'double_elimination');

-- Match stage
CREATE TYPE match_stage AS ENUM ('group', 'playoff');

-- LoL ranks
CREATE TYPE lol_rank AS ENUM (
  'unranked', 'iron', 'bronze', 'silver', 'gold',
  'platinum', 'emerald', 'diamond', 'master',
  'grandmaster', 'challenger'
);
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  discord_id      TEXT UNIQUE NOT NULL,
  discord_username TEXT NOT NULL,
  discord_avatar_url TEXT,
  lol_gamertag    TEXT,
  lol_region      TEXT,
  opgg_url        TEXT,
  current_rank    lol_rank DEFAULT 'unranked',
  current_rank_tier TEXT,
  peak_rank       lol_rank DEFAULT 'unranked',
  peak_rank_tier  TEXT,
  rank_updated_at TIMESTAMPTZ,
  is_organizer    BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_discord ON profiles(discord_id);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by authenticated users"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, discord_id, discord_username, discord_avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'provider_id', NEW.raw_user_meta_data->>'sub', ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Unknown'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
CREATE TABLE tournaments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  description     TEXT,
  status          tournament_status NOT NULL DEFAULT 'setup',
  format          tournament_format NOT NULL,
  created_by      UUID NOT NULL REFERENCES profiles(id),

  -- Planning config
  group_size      INT,
  group_count     INT,
  playoff_type    playoff_format,
  group_bo_format bo_format DEFAULT 'bo1',
  playoff_bo_format bo_format DEFAULT 'bo3',
  finals_bo_format bo_format DEFAULT 'bo5',
  teams_advancing_per_group INT DEFAULT 2,

  -- Captains draft config
  team_budget     INT DEFAULT 15,
  default_player_value INT DEFAULT 3,
  min_player_value INT DEFAULT 0,
  max_player_value INT DEFAULT 7,

  banner_url      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tournaments are viewable by authenticated users"
  ON tournaments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Organizers can create tournaments"
  ON tournaments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_organizer = true)
  );

CREATE POLICY "Organizers can update tournaments"
  ON tournaments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_organizer = true)
  );
CREATE TABLE registrations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id       UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  main_role           lol_role NOT NULL,
  secondary_role      lol_role NOT NULL,
  wants_captain       BOOLEAN DEFAULT FALSE,
  willing_substitute  BOOLEAN DEFAULT FALSE,
  rank_at_registration lol_rank,
  rank_tier_at_registration TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tournament_id, user_id)
);

CREATE INDEX idx_registrations_tournament ON registrations(tournament_id);
CREATE INDEX idx_registrations_user ON registrations(user_id);

-- RLS
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Registrations are viewable by authenticated users"
  ON registrations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can register themselves during registration phase"
  ON registrations FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM tournaments
      WHERE id = tournament_id AND status = 'registration'
    )
  );

CREATE POLICY "Users can update their own registration or organizers can update any"
  ON registrations FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_organizer = true)
  );

CREATE POLICY "Organizers can delete registrations"
  ON registrations FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_organizer = true)
  );
CREATE TABLE teams (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  captain_id      UUID REFERENCES profiles(id),
  name            TEXT,
  tag             TEXT,
  logo_url        TEXT,
  multi_opgg_url  TEXT,
  budget_remaining INT,
  seed            INT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_teams_tournament ON teams(tournament_id);

CREATE TABLE team_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_role   lol_role,
  is_substitute   BOOLEAN DEFAULT FALSE,
  draft_value     INT,
  draft_pick_order INT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(team_id, user_id)
);

CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_team_members_user ON team_members(user_id);

-- RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teams are viewable by authenticated users"
  ON teams FOR SELECT TO authenticated USING (true);

CREATE POLICY "Organizers can create teams"
  ON teams FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_organizer = true));

CREATE POLICY "Captains can update their own team or organizers can update any"
  ON teams FOR UPDATE TO authenticated
  USING (
    auth.uid() = captain_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_organizer = true)
  );

CREATE POLICY "Organizers can delete teams"
  ON teams FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_organizer = true));

CREATE POLICY "Team members are viewable by authenticated users"
  ON team_members FOR SELECT TO authenticated USING (true);

CREATE POLICY "Organizers can manage team members"
  ON team_members FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_organizer = true));

CREATE POLICY "Organizers can update team members"
  ON team_members FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_organizer = true));

CREATE POLICY "Organizers can delete team members"
  ON team_members FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_organizer = true));
CREATE TABLE draft_player_values (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  value           INT NOT NULL DEFAULT 3,

  UNIQUE(tournament_id, user_id)
);

CREATE TABLE draft_state (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   UUID UNIQUE NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  current_pick    INT NOT NULL DEFAULT 1,
  total_picks     INT NOT NULL,
  is_active       BOOLEAN DEFAULT FALSE,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE draft_order (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  pick_number     INT NOT NULL,
  round           INT NOT NULL,
  team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  UNIQUE(tournament_id, pick_number)
);

CREATE TABLE draft_picks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  pick_number     INT NOT NULL,
  round           INT NOT NULL,
  team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  value           INT NOT NULL,
  picked_at       TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tournament_id, pick_number)
);

CREATE INDEX idx_draft_picks_tournament ON draft_picks(tournament_id);

-- RLS
ALTER TABLE draft_player_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_order ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_picks ENABLE ROW LEVEL SECURITY;

-- All draft tables: viewable by authenticated, writable by organizers
CREATE POLICY "Draft values viewable" ON draft_player_values FOR SELECT TO authenticated USING (true);
CREATE POLICY "Organizers manage draft values" ON draft_player_values FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_organizer = true));

CREATE POLICY "Draft state viewable" ON draft_state FOR SELECT TO authenticated USING (true);
CREATE POLICY "Organizers manage draft state" ON draft_state FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_organizer = true));

CREATE POLICY "Draft order viewable" ON draft_order FOR SELECT TO authenticated USING (true);
CREATE POLICY "Organizers manage draft order" ON draft_order FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_organizer = true));

CREATE POLICY "Draft picks viewable" ON draft_picks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Organizers manage draft picks" ON draft_picks FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_organizer = true));
CREATE TABLE groups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  display_order   INT NOT NULL DEFAULT 0
);

CREATE TABLE group_teams (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  wins            INT DEFAULT 0,
  losses          INT DEFAULT 0,
  map_wins        INT DEFAULT 0,
  map_losses      INT DEFAULT 0,
  points          INT DEFAULT 0,
  seed_position   INT,

  UNIQUE(group_id, team_id)
);

CREATE INDEX idx_group_teams_group ON group_teams(group_id);

-- RLS
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Groups viewable" ON groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Organizers manage groups" ON groups FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_organizer = true));

CREATE POLICY "Group teams viewable" ON group_teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "Organizers manage group teams" ON group_teams FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_organizer = true));
CREATE TABLE matches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  stage           match_stage NOT NULL,
  group_id        UUID REFERENCES groups(id) ON DELETE SET NULL,
  bracket_position TEXT,
  round           INT,

  team_a_id       UUID REFERENCES teams(id),
  team_b_id       UUID REFERENCES teams(id),
  bo_format       bo_format NOT NULL,

  team_a_score    INT DEFAULT 0,
  team_b_score    INT DEFAULT 0,
  winner_id       UUID REFERENCES teams(id),
  is_completed    BOOLEAN DEFAULT FALSE,

  team_a_reported_winner UUID REFERENCES teams(id),
  team_b_reported_winner UUID REFERENCES teams(id),
  is_disputed     BOOLEAN DEFAULT FALSE,

  is_losers_bracket BOOLEAN DEFAULT FALSE,

  scheduled_at    TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE match_games (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id        UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  game_number     INT NOT NULL,
  winner_id       UUID REFERENCES teams(id),
  screenshot_urls TEXT[] DEFAULT '{}',
  duration        TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_matches_tournament ON matches(tournament_id);
CREATE INDEX idx_matches_group ON matches(group_id);
CREATE INDEX idx_match_games_match ON match_games(match_id);

-- RLS
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Matches viewable" ON matches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Organizers can create matches" ON matches FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_organizer = true));

-- Captains can update matches they're involved in (for reporting), or organizers
CREATE POLICY "Captains and organizers can update matches" ON matches FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_organizer = true)
    OR EXISTS (
      SELECT 1 FROM teams
      WHERE (teams.id = matches.team_a_id OR teams.id = matches.team_b_id)
      AND teams.captain_id = auth.uid()
    )
  );

CREATE POLICY "Match games viewable" ON match_games FOR SELECT TO authenticated USING (true);

-- Captains of involved teams or organizers can manage match games
CREATE POLICY "Captains and organizers manage match games" ON match_games FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_organizer = true)
    OR EXISTS (
      SELECT 1 FROM matches
      JOIN teams ON (teams.id = matches.team_a_id OR teams.id = matches.team_b_id)
      WHERE matches.id = match_games.match_id AND teams.captain_id = auth.uid()
    )
  );
CREATE TABLE playoff_bracket_slots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  match_id        UUID REFERENCES matches(id),
  position        TEXT NOT NULL,
  round           INT NOT NULL,
  slot_index      INT NOT NULL,
  is_losers_bracket BOOLEAN DEFAULT FALSE,
  next_slot_id    UUID REFERENCES playoff_bracket_slots(id),
  loser_slot_id   UUID REFERENCES playoff_bracket_slots(id),

  UNIQUE(tournament_id, position)
);

CREATE TABLE tournament_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   UUID UNIQUE NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  first_place_id  UUID REFERENCES teams(id),
  second_place_id UUID REFERENCES teams(id),
  third_place_id  UUID REFERENCES teams(id),
  mvp_user_id     UUID REFERENCES profiles(id),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE playoff_bracket_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bracket slots viewable" ON playoff_bracket_slots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Organizers manage bracket slots" ON playoff_bracket_slots FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_organizer = true));

CREATE POLICY "Results viewable" ON tournament_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "Organizers manage results" ON tournament_results FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_organizer = true));
