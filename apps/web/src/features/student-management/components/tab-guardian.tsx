"use client";

import type { Guardian } from "../types";
import { Avatar } from "./avatar";

interface TabGuardianProps {
  guardians: Guardian[];
}

export function TabGuardian({ guardians }: TabGuardianProps) {
  if (guardians.length === 0) {
    return (
      <div style={{ color: "#94a3b8", fontSize: 14, padding: "24px 0" }}>
        등록된 비상연락처가 없습니다.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {guardians.map((guardian) => (
        <div
          key={guardian.id}
          className="flex items-center gap-3 p-4 bg-surface-2 border border-border rounded"
        >
          <Avatar name={guardian.name} size={40} />
          <div>
            <div className="font-semibold text-text text-sm">
              {guardian.name}
            </div>
            <div className="text-[13px] text-text-secondary">
              {guardian.relation} · {guardian.phone}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
