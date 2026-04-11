"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/types/database";

type DraftPick = Database["public"]["Tables"]["draft_picks"]["Row"];
type DraftState = Database["public"]["Tables"]["draft_state"]["Row"];

interface UseRealtimeDraftReturn {
  picks: DraftPick[];
  draftState: DraftState | null;
  isConnected: boolean;
}

export function useRealtimeDraft(
  tournamentId: string,
  initialPicks: DraftPick[],
  initialState: DraftState | null
): UseRealtimeDraftReturn {
  const [picks, setPicks] = useState<DraftPick[]>(initialPicks);
  const [draftState, setDraftState] = useState<DraftState | null>(initialState);
  const [isConnected, setIsConnected] = useState(false);

  const supabase = createClient();

  const handleNewPick = useCallback(
    (payload: { new: DraftPick }) => {
      setPicks((prev) => {
        const exists = prev.some((p) => p.id === payload.new.id);
        if (exists) return prev;
        return [...prev, payload.new];
      });
    },
    []
  );

  const handleStateUpdate = useCallback(
    (payload: { new: DraftState }) => {
      setDraftState(payload.new);
    },
    []
  );

  useEffect(() => {
    const channel = supabase
      .channel(`draft:${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "draft_picks",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        handleNewPick as (payload: unknown) => void
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "draft_state",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        handleStateUpdate as (payload: unknown) => void
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId, supabase, handleNewPick, handleStateUpdate]);

  // Sync with initial data on mount
  useEffect(() => {
    setPicks(initialPicks);
  }, [initialPicks]);

  useEffect(() => {
    setDraftState(initialState);
  }, [initialState]);

  return { picks, draftState, isConnected };
}
