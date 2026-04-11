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
