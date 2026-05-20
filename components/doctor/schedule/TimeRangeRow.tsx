"use client";

import { Trash2 } from "lucide-react";
import type { TimeRange } from "@/types/firestore";

interface TimeRangeRowProps {
  range: TimeRange;
  onUpdate: (field: keyof TimeRange, value: string) => void;
  onRemove: () => void;
}

export function TimeRangeRow({ range, onUpdate, onRemove }: TimeRangeRowProps) {
  const hasError = range.startTime >= range.endTime;

  return (
    <div className={`flex items-end gap-2 p-3 rounded-xl ${hasError ? "bg-red-50 border border-red-100" : "bg-primary/5"}`}>
      <div className="flex-1">
        <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
          From
        </label>
        <input
          type="time"
          value={range.startTime}
          onChange={(e) => onUpdate("startTime", e.target.value)}
          className="w-full text-sm bg-white border border-primary/10 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 text-primary"
        />
      </div>

      <div className="pb-2 text-muted-foreground/40 text-xs select-none">→</div>

      <div className="flex-1">
        <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
          To
        </label>
        <input
          type="time"
          value={range.endTime}
          onChange={(e) => onUpdate("endTime", e.target.value)}
          className="w-full text-sm bg-white border border-primary/10 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 text-primary"
        />
      </div>

      <button
        onClick={onRemove}
        className="pb-1.5 p-2 rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
        aria-label="Remove time range"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {hasError && (
        <p className="absolute text-[10px] text-red-500 mt-1">End time must be after start time</p>
      )}
    </div>
  );
}
