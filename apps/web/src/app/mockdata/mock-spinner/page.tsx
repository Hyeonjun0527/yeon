"use client";

import { Loader2 } from "lucide-react";

export default function MockSpinnerPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8 bg-bg text-text">
      <h1 className="text-lg font-semibold">Spinner Test</h1>

      {/* 1. Tailwind animate-spin + Loader2 */}
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-text-secondary">Tailwind animate-spin + Loader2</p>
        <Loader2 size={36} className="animate-spin text-accent" />
      </div>

      {/* 2. Tailwind animate-spin + div border */}
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-text-secondary">Tailwind animate-spin + div</p>
        <div className="w-9 h-9 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );
}
