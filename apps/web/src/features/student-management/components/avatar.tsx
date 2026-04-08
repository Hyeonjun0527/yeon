"use client";

import { getAvatarColor, getInitial } from "../utils";

interface AvatarProps {
  name: string;
  size?: number;
}

export function Avatar({ name, size = 40 }: AvatarProps) {
  const bg = getAvatarColor(name);
  const initial = getInitial(name);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.4,
        fontWeight: 700,
        color: "#fff",
        flexShrink: 0,
        border: "2px solid rgba(255, 255, 255, 0.1)",
      }}
    >
      {initial}
    </div>
  );
}
