"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "yeon:typing-player-id";

function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function usePlayerIdentity() {
  const [playerId, setPlayerId] = useState<string | null>(null);

  useEffect(() => {
    try {
      let id = localStorage.getItem(STORAGE_KEY);
      if (!id) {
        id = generateId();
        localStorage.setItem(STORAGE_KEY, id);
      }
      setPlayerId(id);
    } catch {
      setPlayerId(generateId());
    }
  }, []);

  return playerId;
}
