"use client";

import { CalendarCheck, Save, Check } from "lucide-react";

interface ScheduleHeaderProps {
  onSave: () => void;
  saving: boolean;
  saved: boolean;
}

export function ScheduleHeader({ onSave, saving, saved }: ScheduleHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <CalendarCheck className="h-4 w-4 text-primary/60" />
          <p className="text-xs uppercase tracking-widest text-primary/50 font-medium">Clinic Management</p>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl text-primary tracking-tight">
          Schedule & Availability
        </h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Manage your consultation timings and unavailable periods.
        </p>
      </div>

      <button
        onClick={onSave}
        disabled={saving}
        className="hidden sm:flex items-center gap-2 bg-primary text-white rounded-2xl px-6 h-11 text-sm font-medium shadow-sm hover:bg-primary/90 transition-all disabled:opacity-70 shrink-0"
      >
        {saving ? (
          <>
            <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Saving...
          </>
        ) : saved ? (
          <>
            <Check className="h-4 w-4" />
            Saved!
          </>
        ) : (
          <>
            <Save className="h-4 w-4" />
            Save Schedule
          </>
        )}
      </button>
    </div>
  );
}
