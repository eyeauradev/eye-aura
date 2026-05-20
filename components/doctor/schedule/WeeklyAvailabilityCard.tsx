"use client";

import { useState } from "react";
import { ChevronDown, Clock, Plus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { TimeRangeRow } from "./TimeRangeRow";
import type { DayOfWeek, TimeRange } from "@/types/firestore";

interface DaySchedule {
  dayOfWeek: DayOfWeek;
  timeRanges: TimeRange[];
  isOff: boolean;
  duration: number;
}

interface WeeklyAvailabilityCardProps {
  day: DayOfWeek;
  dayLabel: string;
  schedule: DaySchedule;
  onUpdate: (day: DayOfWeek, updates: Partial<DaySchedule>) => void;
  defaultOpen?: boolean;
}

const DURATIONS = [15, 20, 30, 45, 60];

const DAY_ABBREVIATIONS: Record<DayOfWeek, string> = {
  monday: "MON",
  tuesday: "TUE",
  wednesday: "WED",
  thursday: "THU",
  friday: "FRI",
  saturday: "SAT",
  sunday: "SUN",
};

const WEEKEND_DAYS: DayOfWeek[] = ["saturday", "sunday"];

export function WeeklyAvailabilityCard({
  day,
  dayLabel,
  schedule,
  onUpdate,
  defaultOpen = false,
}: WeeklyAvailabilityCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  const isWeekend = WEEKEND_DAYS.includes(day);

  const addTimeRange = () => {
    const last = schedule.timeRanges[schedule.timeRanges.length - 1];
    const newStart = last ? last.endTime : "09:00";
    onUpdate(day, {
      timeRanges: [...schedule.timeRanges, { startTime: newStart, endTime: "17:00" }],
    });
  };

  const removeTimeRange = (index: number) => {
    onUpdate(day, { timeRanges: schedule.timeRanges.filter((_, i) => i !== index) });
  };

  const updateTimeRange = (index: number, field: keyof TimeRange, value: string) => {
    onUpdate(day, {
      timeRanges: schedule.timeRanges.map((r, i) => (i === index ? { ...r, [field]: value } : r)),
    });
  };

  const toggleOff = (checked: boolean) => {
    onUpdate(day, { isOff: !checked, timeRanges: !checked ? [] : schedule.timeRanges });
    if (!checked) setOpen(false);
    else setOpen(true);
  };

  const rangesSummary = () => {
    if (schedule.timeRanges.length === 0) return "No hours set";
    const formatT = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
    };
    if (schedule.timeRanges.length === 1) {
      const r = schedule.timeRanges[0];
      return `${formatT(r.startTime)} – ${formatT(r.endTime)} · ${schedule.duration}m slots`;
    }
    return `${schedule.timeRanges.length} ranges · ${schedule.duration}m slots`;
  };

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 ${
        schedule.isOff
          ? "border-dashed border-muted-foreground/20 bg-muted/10"
          : open
          ? "border-primary/20 bg-white shadow-sm"
          : "border-primary/10 bg-white/60 hover:bg-white hover:shadow-sm"
      }`}
    >
      {/* Card Header */}
      <div className="flex items-center gap-4 px-4 py-4">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-bold tracking-wide shrink-0 ${
            schedule.isOff
              ? "bg-muted text-muted-foreground"
              : isWeekend
              ? "bg-amber-50 text-amber-700"
              : "bg-primary/10 text-primary"
          }`}
        >
          {DAY_ABBREVIATIONS[day]}
        </div>

        <button
          className="flex-1 text-left min-w-0"
          onClick={() => !schedule.isOff && setOpen(!open)}
        >
          <p className={`font-medium text-sm ${schedule.isOff ? "text-muted-foreground" : "text-primary"}`}>
            {dayLabel}
          </p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {schedule.isOff ? "Day off" : rangesSummary()}
          </p>
        </button>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Switch
              checked={!schedule.isOff}
              onCheckedChange={toggleOff}
              className="data-[state=checked]:bg-primary scale-90"
            />
            <span className="text-xs text-muted-foreground w-8">
              {schedule.isOff ? "Off" : "On"}
            </span>
          </div>

          {!schedule.isOff && (
            <button
              onClick={() => setOpen(!open)}
              className={`p-1 rounded-lg hover:bg-primary/5 text-muted-foreground transition-all duration-200 ${open ? "rotate-180" : ""}`}
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      <div
        className={`overflow-hidden transition-all duration-200 ${open && !schedule.isOff ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"}`}
      >
            <div className="px-4 pb-4 space-y-4 border-t border-primary/5 pt-4">
              {/* Duration Selector */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="text-xs">Slot duration</span>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {DURATIONS.map((d) => (
                    <button
                      key={d}
                      onClick={() => onUpdate(day, { duration: d })}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                        schedule.duration === d
                          ? "bg-primary text-white shadow-sm"
                          : "bg-primary/5 text-primary/60 hover:bg-primary/10 hover:text-primary"
                      }`}
                    >
                      {d}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Ranges */}
              <div className="space-y-2">
                {schedule.timeRanges.length === 0 ? (
                  <div className="text-center py-5 rounded-xl bg-primary/5">
                    <Clock className="h-5 w-5 text-primary/20 mx-auto mb-1.5" />
                    <p className="text-xs text-muted-foreground">No working hours added yet</p>
                  </div>
                ) : (
                  schedule.timeRanges.map((range, index) => (
                    <TimeRangeRow
                      key={index}
                      range={range}
                      onUpdate={(field, value) => updateTimeRange(index, field, value)}
                      onRemove={() => removeTimeRange(index)}
                    />
                  ))
                )}
              </div>

              {/* Add Time Range */}
              <button
                onClick={addTimeRange}
                className="w-full flex items-center justify-center gap-2 border border-dashed border-primary/20 text-primary/60 hover:text-primary hover:bg-primary/5 hover:border-primary/30 rounded-xl h-9 text-xs font-medium transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                Add time range
              </button>
            </div>
      </div>
    </div>
  );
}
