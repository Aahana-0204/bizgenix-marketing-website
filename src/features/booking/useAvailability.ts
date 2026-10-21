"use client";
import { useEffect, useReducer, useState } from "react";
import { api } from "@/lib/ApiClient";
import type { Slot } from "@/shared/schemas";
type State = { slots: Slot[]; loading: boolean; error: string };
export function useAvailability(date: string) {
  const [revision, refresh] = useReducer(value => value + 1, 0);
  const [state, setState] = useState<State>({ slots: [], loading: true, error: "" });
  useEffect(() => {
    const controller = new AbortController();
    api.availability(date, controller.signal).then(slots => setState({ slots, loading: false, error: "" })).catch((error: Error) => { if (error.name !== "AbortError") setState({ slots: [], loading: false, error: error.message }); });
    return () => controller.abort();
  }, [date, revision]);
  return { ...state, refresh: () => { setState({ slots: [], loading: true, error: "" }); refresh(); } };
}
