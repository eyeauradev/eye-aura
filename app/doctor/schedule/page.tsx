"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { doctorAvailabilityService } from "@/services/firestore/doctor-availability.service";
import { doctorBlocksService } from "@/services/firestore/doctor-blocks.service";
import type { DayOfWeek, TimeRange, DoctorBlockDocument } from "@/types/firestore";
import { ScheduleHeader } from "@/components/doctor/schedule/ScheduleHeader";
import { WeeklyAvailabilityCard } from "@/components/doctor/schedule/WeeklyAvailabilityCard";
import { UnavailableBlockCard } from "@/components/doctor/schedule/UnavailableBlockCard";
import { AvailabilityPreview } from "@/components/doctor/schedule/AvailabilityPreview";
import { TYPOGRAPHY } from "@/lib/design-tokens";

const DAYS: DayOfWeek[] = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
];

const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

interface DaySchedule {
  dayOfWeek: DayOfWeek;
  timeRanges: TimeRange[];
  isOff: boolean;
  duration: number;
}

const defaultSchedules = (): Record<DayOfWeek, DaySchedule> =>
  DAYS.reduce((acc, day) => {
    acc[day] = { dayOfWeek: day, timeRanges: [], isOff: day === "sunday", duration: 30 };
    return acc;
  }, {} as Record<DayOfWeek, DaySchedule>);

export default function DoctorSchedulePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [schedules, setSchedules] = useState<Record<DayOfWeek, DaySchedule>>(defaultSchedules);
  const [blocks, setBlocks] = useState<DoctorBlockDocument[]>([]);

  useEffect(() => {
    if (!user) return;

    async function load() {
      if (!user) return;
      try {
        setLoading(true);
        const [availabilities, doctorBlocks] = await Promise.all([
          doctorAvailabilityService.getByDoctorId(user.id),
          doctorBlocksService.getByDoctorId(user.id),
        ]);

        const newSchedules = defaultSchedules();
        availabilities.forEach((a) => {
          newSchedules[a.dayOfWeek] = {
            dayOfWeek: a.dayOfWeek,
            timeRanges: a.timeRanges,
            isOff: a.isOff,
            duration: a.duration,
          };
        });
        setSchedules(newSchedules);
        setBlocks(doctorBlocks);
      } catch (error) {
        console.error("Failed to load schedule:", error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user]);

  const updateSchedule = (day: DayOfWeek, updates: Partial<DaySchedule>) => {
    setSchedules((prev) => ({ ...prev, [day]: { ...prev[day], ...updates } }));
  };

  const handleSave = async () => {
    if (!user) return;
    try {
      setSaving(true);
      for (const day of DAYS) {
        const s = schedules[day];
        await doctorAvailabilityService.upsertAvailability(user.id, day, s.timeRanges, s.duration, s.isOff);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddBlock = async (data: { start: Date; end: Date; reason: string }) => {
    if (!user) return;
    const newBlock = await doctorBlocksService.create({ doctorId: user.id, ...data });
    setBlocks((prev) =>
      [...prev, newBlock].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    );
  };

  const handleDeleteBlock = async (id: string) => {
    await doctorBlocksService.delete(id);
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading your schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-10 pb-28">
      {/* Header */}
      <ScheduleHeader onSave={handleSave} saving={saving} saved={saved} />

      {/* Weekly Working Hours */}
      <section>
        <div className="mb-4">
          <h2 className={TYPOGRAPHY.subheading}>Weekly Working Hours</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure your working hours for each day of the week.
          </p>
        </div>
        <div className="space-y-2">
          {DAYS.map((day) => (
            <WeeklyAvailabilityCard
              key={day}
              day={day}
              dayLabel={DAY_LABELS[day]}
              schedule={schedules[day]}
              onUpdate={updateSchedule}
            />
          ))}
        </div>
      </section>

      {/* Unavailable Blocks */}
      <section className="rounded-2xl border border-primary/10 bg-white/60 p-5 sm:p-6">
        <UnavailableBlockCard
          blocks={blocks}
          onAdd={handleAddBlock}
          onDelete={handleDeleteBlock}
        />
      </section>

      {/* Availability Preview */}
      <section className="rounded-2xl border border-primary/10 bg-white/60 p-5 sm:p-6">
        <AvailabilityPreview schedules={schedules} />
      </section>

      {/* Sticky mobile save button */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center sm:hidden z-50 px-4 pointer-events-none">
        <button
          onClick={handleSave}
          disabled={saving}
          className="pointer-events-auto bg-primary text-white rounded-2xl px-10 py-3.5 text-sm font-medium shadow-xl shadow-primary/25 active:scale-95 transition-transform disabled:opacity-70"
        >
          {saving ? "Saving..." : saved ? "Saved ✓" : "Save Schedule"}
        </button>
      </div>
    </div>
  );
}
