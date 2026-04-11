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
