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
