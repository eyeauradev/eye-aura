"use client";

import { useMemo } from "react";
import type { DayOfWeek, TimeRange } from "@/types/firestore";

interface DaySchedule {
  dayOfWeek: DayOfWeek;
  timeRanges: TimeRange[];
  isOff: boolean;
  duration: number;
}

interface AvailabilityPreviewProps {
  schedules: Record<DayOfWeek, DaySchedule>;
}

const DAY_MAP: Record<number, DayOfWeek> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

export function AvailabilityPreview({ schedules }: AvailabilityPreviewProps) {
  const next7Days = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dow = DAY_MAP[date.getDay()];
      const schedule = schedules[dow];
      days.push({ date, dow, schedule });
    }
    return days;
  }, [schedules]);

  const formatTime = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
  };

  const availableDays = next7Days.filter(({ schedule }) => !schedule.isOff && schedule.timeRanges.length > 0);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-display text-primary font-semibold">Upcoming Availability</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          How your schedule appears to patients over the next 7 days.
        </p>
      </div>

      {/* 7-day mini calendar strip */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {next7Days.map(({ date, schedule }, i) => {
          const isToday = i === 0;
          const hasHours = !schedule.isOff && schedule.timeRanges.length > 0;
          return (
            <div
              key={i}
              className={`rounded-2xl p-2 sm:p-3 text-center transition-all ${
                isToday
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : hasHours
                  ? "bg-emerald-50 border border-emerald-100"
                  : "bg-muted/20 border border-dashed border-muted-foreground/15"
              }`}
            >
              <p
                className={`text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider ${
                  isToday ? "text-white/70" : "text-muted-foreground"
                }`}
              >
                {date.toLocaleDateString("en-US", { weekday: "short" })}
              </p>
              <p
                className={`text-base sm:text-lg font-bold mt-0.5 ${
                  isToday ? "text-white" : hasHours ? "text-emerald-700" : "text-muted-foreground/30"
                }`}
              >
                {date.getDate()}
              </p>
              <div
                className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full mx-auto mt-1.5 ${
                  isToday ? "bg-white/60" : hasHours ? "bg-emerald-400" : "bg-transparent"
                }`}
              />
            </div>
          );
        })}
      </div>

      {/* Time slot detail list */}
      {availableDays.length === 0 ? (
        <div className="text-center py-8 rounded-2xl bg-muted/10 border border-dashed border-muted-foreground/15">
          <p className="text-sm text-muted-foreground">No working hours set for the next 7 days.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Configure your weekly hours above to see availability here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {availableDays.slice(0, 5).map(({ date, schedule }, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-primary/5 bg-white/80"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <p className="text-sm font-medium text-primary shrink-0">
                {date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </p>
              <div className="flex gap-1.5 flex-wrap overflow-hidden">
                {schedule.timeRanges.map((r, j) => (
                  <span
                    key={j}
                    className="text-[11px] text-muted-foreground bg-primary/5 px-2 py-0.5 rounded-full whitespace-nowrap"
                  >
                    {formatTime(r.startTime)} – {formatTime(r.endTime)}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
