export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          discord_id: string;
          discord_username: string;
          discord_avatar_url: string | null;
          lol_gamertag: string | null;
          lol_region: string | null;
          opgg_url: string | null;
          current_rank: string;
          current_rank_tier: string | null;
          peak_rank: string;
          peak_rank_tier: string | null;
          rank_updated_at: string | null;
          is_organizer: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          discord_id: string;
          discord_username: string;
          discord_avatar_url?: string | null;
          lol_gamertag?: string | null;
          lol_region?: string | null;
          opgg_url?: string | null;
          current_rank?: string;
          current_rank_tier?: string | null;
          peak_rank?: string;
          peak_rank_tier?: string | null;
          rank_updated_at?: string | null;
          is_organizer?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          discord_id?: string;
          discord_username?: string;
          discord_avatar_url?: string | null;
          lol_gamertag?: string | null;
          lol_region?: string | null;
          opgg_url?: string | null;
          current_rank?: string;
          current_rank_tier?: string | null;
          peak_rank?: string;
          peak_rank_tier?: string | null;
          rank_updated_at?: string | null;
          is_organizer?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      tournaments: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          status: string;
          format: string;
          created_by: string;
          group_size: number | null;
          group_count: number | null;
          playoff_type: string | null;
          group_bo_format: string;
          playoff_bo_format: string;
          finals_bo_format: string;
          teams_advancing_per_group: number;
          team_budget: number;
          default_player_value: number;
          min_player_value: number;
          max_player_value: number;
          banner_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          status?: string;
          format: string;
          created_by: string;
          group_size?: number | null;
          group_count?: number | null;
          playoff_type?: string | null;
          group_bo_format?: string;
          playoff_bo_format?: string;
          finals_bo_format?: string;
          teams_advancing_per_group?: number;
          team_budget?: number;
          default_player_value?: number;
          min_player_value?: number;
          max_player_value?: number;
          banner_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          status?: string;
          format?: string;
          created_by?: string;
          group_size?: number | null;
          group_count?: number | null;
          playoff_type?: string | null;
          group_bo_format?: string;
          playoff_bo_format?: string;
          finals_bo_format?: string;
          teams_advancing_per_group?: number;
          team_budget?: number;
          default_player_value?: number;
          min_player_value?: number;
          max_player_value?: number;
          banner_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      registrations: {
        Row: {
          id: string;
          tournament_id: string;
          user_id: string;
          main_role: string;
          secondary_role: string;
          wants_captain: boolean;
          willing_substitute: boolean;
          rank_at_registration: string | null;
          rank_tier_at_registration: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          user_id: string;
          main_role: string;
          secondary_role: string;
          wants_captain?: boolean;
          willing_substitute?: boolean;
          rank_at_registration?: string | null;
          rank_tier_at_registration?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          user_id?: string;
          main_role?: string;
          secondary_role?: string;
          wants_captain?: boolean;
          willing_substitute?: boolean;
          rank_at_registration?: string | null;
          rank_tier_at_registration?: string | null;
          created_at?: string;
        };
      };
      teams: {
        Row: {
          id: string;
          tournament_id: string;
          captain_id: string | null;
          name: string | null;
          tag: string | null;
          logo_url: string | null;
          multi_opgg_url: string | null;
          budget_remaining: number | null;
          seed: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          captain_id?: string | null;
          name?: string | null;
          tag?: string | null;
          logo_url?: string | null;
          multi_opgg_url?: string | null;
          budget_remaining?: number | null;
          seed?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          captain_id?: string | null;
          name?: string | null;
          tag?: string | null;
          logo_url?: string | null;
          multi_opgg_url?: string | null;
          budget_remaining?: number | null;
          seed?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      team_members: {
        Row: {
          id: string;
          team_id: string;
          user_id: string;
          assigned_role: string | null;
          is_substitute: boolean;
          draft_value: number | null;
          draft_pick_order: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          user_id: string;
          assigned_role?: string | null;
          is_substitute?: boolean;
          draft_value?: number | null;
          draft_pick_order?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          user_id?: string;
          assigned_role?: string | null;
          is_substitute?: boolean;
          draft_value?: number | null;
          draft_pick_order?: number | null;
          created_at?: string;
        };
      };
      draft_player_values: {
        Row: {
          id: string;
          tournament_id: string;
          user_id: string;
          value: number;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          user_id: string;
          value?: number;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          user_id?: string;
          value?: number;
        };
      };
      draft_state: {
        Row: {
          id: string;
          tournament_id: string;
          current_pick: number;
          total_picks: number;
          is_active: boolean;
          started_at: string | null;
          completed_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          current_pick?: number;
          total_picks: number;
          is_active?: boolean;
          started_at?: string | null;
          completed_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          current_pick?: number;
          total_picks?: number;
          is_active?: boolean;
          started_at?: string | null;
          completed_at?: string | null;
          updated_at?: string;
        };
      };
      draft_picks: {
        Row: {
          id: string;
          tournament_id: string;
          pick_number: number;
          round: number;
          team_id: string;
          user_id: string;
          value: number;
          picked_at: string;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          pick_number: number;
          round: number;
          team_id: string;
          user_id: string;
          value: number;
          picked_at?: string;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          pick_number?: number;
          round?: number;
          team_id?: string;
          user_id?: string;
          value?: number;
          picked_at?: string;
        };
      };
      draft_order: {
        Row: {
          id: string;
          tournament_id: string;
          pick_number: number;
          round: number;
          team_id: string;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          pick_number: number;
          round: number;
          team_id: string;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          pick_number?: number;
          round?: number;
          team_id?: string;
        };
      };
      groups: {
        Row: {
          id: string;
          tournament_id: string;
          name: string;
          display_order: number;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          name: string;
          display_order?: number;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          name?: string;
          display_order?: number;
        };
      };
      group_teams: {
        Row: {
          id: string;
          group_id: string;
          team_id: string;
          wins: number;
          losses: number;
          map_wins: number;
          map_losses: number;
          points: number;
          seed_position: number | null;
        };
        Insert: {
          id?: string;
          group_id: string;
          team_id: string;
          wins?: number;
          losses?: number;
          map_wins?: number;
          map_losses?: number;
          points?: number;
          seed_position?: number | null;
        };
        Update: {
          id?: string;
          group_id?: string;
          team_id?: string;
          wins?: number;
          losses?: number;
          map_wins?: number;
          map_losses?: number;
          points?: number;
          seed_position?: number | null;
        };
      };
      matches: {
        Row: {
          id: string;
          tournament_id: string;
          stage: string;
          group_id: string | null;
          bracket_position: string | null;
          round: number | null;
          team_a_id: string | null;
          team_b_id: string | null;
          bo_format: string;
          team_a_score: number;
          team_b_score: number;
          winner_id: string | null;
          is_completed: boolean;
          team_a_reported_winner: string | null;
          team_b_reported_winner: string | null;
          is_disputed: boolean;
          is_losers_bracket: boolean;
          scheduled_at: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          stage: string;
          group_id?: string | null;
          bracket_position?: string | null;
          round?: number | null;
          team_a_id?: string | null;
          team_b_id?: string | null;
          bo_format: string;
          team_a_score?: number;
          team_b_score?: number;
          winner_id?: string | null;
          is_completed?: boolean;
          team_a_reported_winner?: string | null;
          team_b_reported_winner?: string | null;
          is_disputed?: boolean;
          is_losers_bracket?: boolean;
          scheduled_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          stage?: string;
          group_id?: string | null;
          bracket_position?: string | null;
          round?: number | null;
          team_a_id?: string | null;
          team_b_id?: string | null;
          bo_format?: string;
          team_a_score?: number;
          team_b_score?: number;
          winner_id?: string | null;
          is_completed?: boolean;
          team_a_reported_winner?: string | null;
          team_b_reported_winner?: string | null;
          is_disputed?: boolean;
          is_losers_bracket?: boolean;
          scheduled_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
      };
      match_games: {
        Row: {
          id: string;
          match_id: string;
          game_number: number;
          winner_id: string | null;
          screenshot_urls: string[];
          duration: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          game_number: number;
          winner_id?: string | null;
          screenshot_urls?: string[];
          duration?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          game_number?: number;
          winner_id?: string | null;
          screenshot_urls?: string[];
          duration?: string | null;
          notes?: string | null;
          created_at?: string;
        };
      };
      playoff_bracket_slots: {
        Row: {
          id: string;
          tournament_id: string;
          match_id: string | null;
          position: string;
          round: number;
          slot_index: number;
          is_losers_bracket: boolean;
          next_slot_id: string | null;
          loser_slot_id: string | null;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          match_id?: string | null;
          position: string;
          round: number;
          slot_index: number;
          is_losers_bracket?: boolean;
          next_slot_id?: string | null;
          loser_slot_id?: string | null;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          match_id?: string | null;
          position?: string;
          round?: number;
          slot_index?: number;
          is_losers_bracket?: boolean;
          next_slot_id?: string | null;
          loser_slot_id?: string | null;
        };
      };
      tournament_results: {
        Row: {
          id: string;
          tournament_id: string;
          first_place_id: string | null;
          second_place_id: string | null;
          third_place_id: string | null;
          mvp_user_id: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          first_place_id?: string | null;
          second_place_id?: string | null;
          third_place_id?: string | null;
          mvp_user_id?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          first_place_id?: string | null;
          second_place_id?: string | null;
          third_place_id?: string | null;
          mvp_user_id?: string | null;
          notes?: string | null;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      tournament_status:
        | "setup"
        | "registration"
        | "planning"
        | "scouting"
        | "captains_draft"
        | "team_setup"
        | "group_stage"
        | "playoff"
        | "results"
        | "archived";
      tournament_format: "premade_teams" | "captains_draft";
      lol_role: "top" | "jungle" | "mid" | "adc" | "support" | "fill";
      bo_format: "bo1" | "bo3" | "bo5";
      playoff_format: "single_elimination" | "double_elimination";
      match_stage: "group" | "playoff";
      lol_rank:
        | "unranked"
        | "iron"
        | "bronze"
        | "silver"
        | "gold"
        | "platinum"
        | "emerald"
        | "diamond"
        | "master"
        | "grandmaster"
        | "challenger";
    };
  };
};
