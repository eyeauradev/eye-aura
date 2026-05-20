"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/auth-context";
import { doctorAvailabilityService } from "@/services/firestore/doctor-availability.service";
import { doctorBlocksService } from "@/services/firestore/doctor-blocks.service";
import type { DoctorAvailabilityDocument, DoctorBlockDocument, DayOfWeek } from "@/types/firestore";
import { Calendar, Clock, Plus, Ban, Trash2, ChevronLeft, ChevronRight, Settings, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DOW_MAP: Record<number, DayOfWeek> = {
  0: "sunday", 1: "monday", 2: "tuesday", 3: "wednesday",
  4: "thursday", 5: "friday", 6: "saturday",
};

const formatTime = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

const formatDateLabel = (d: Date) =>
  d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

const formatDateTime = (d: Date) =>
  new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default function DoctorSlotsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState<DoctorAvailabilityDocument[]>([]);
  const [blocks, setBlocks] = useState<DoctorBlockDocument[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [blockForm, setBlockForm] = useState({ startDate: "", startTime: "09:00", endDate: "", endTime: "18:00", reason: "" });
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    async function load() {
      if (!user) return;
      try {
        setLoading(true);
        const [availData, blockData] = await Promise.all([
          doctorAvailabilityService.getByDoctorId(user.id),
          doctorBlocksService.getByDoctorId(user.id),
        ]);
        setAvailability(availData);
        setBlocks(blockData);
      } catch (err) {
        console.error("Error loading schedule data:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const weekDays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monday = new Date(today);
    const diff = (today.getDay() + 6) % 7;
    monday.setDate(today.getDate() - diff + weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, [weekOffset]);

  const availMap = useMemo(() => {
    const map: Record<string, DoctorAvailabilityDocument> = {};
    availability.forEach((a) => { map[a.dayOfWeek] = a; });
    return map;
  }, [availability]);

  const getDayBlocks = (date: Date) =>
    blocks.filter((b) => {
      const start = new Date(b.start);
      const end = new Date(b.end);
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d); next.setDate(d.getDate() + 1);
      return start < next && end > d;
    });

  const getSelectedAvail = () => availMap[DOW_MAP[selectedDay.getDay()]];
  const selectedBlocks = getDayBlocks(selectedDay);
  const isToday = (d: Date) => d.toDateString() === new Date().toDateString();
  const isSelected = (d: Date) => d.toDateString() === selectedDay.toDateString();
  const isPast = (d: Date) => { const t = new Date(); t.setHours(0,0,0,0); return d < t; };

  const handleAddBlock = async () => {
    if (!user || !blockForm.startDate || !blockForm.endDate) return;
    setAdding(true);
    try {
      const start = new Date(`${blockForm.startDate}T${blockForm.startTime}`);
      const end = new Date(`${blockForm.endDate}T${blockForm.endTime}`);
      const newBlock = await doctorBlocksService.create({ doctorId: user.id, start, end, reason: blockForm.reason });
      setBlocks((prev) => [...prev, newBlock].sort((a,b) => new Date(a.start).getTime() - new Date(b.start).getTime()));
      setShowBlockForm(false);
      setBlockForm({ startDate: "", startTime: "09:00", endDate: "", endTime: "18:00", reason: "" });
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteBlock = async (id: string) => {
    setDeletingId(id);
    try {
      await doctorBlocksService.delete(id);
      setBlocks((prev) => prev.filter((b) => b.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const isBlockFormValid = blockForm.startDate && blockForm.endDate &&
    new Date(`${blockForm.startDate}T${blockForm.startTime}`) < new Date(`${blockForm.endDate}T${blockForm.endTime}`);

  const activeDays = availability.filter((a) => !a.isOff).length;
  const avgDuration = availability.length > 0
    ? Math.round(availability.reduce((s, a) => s + a.duration, 0) / availability.length)
    : 30;
  const upcomingBlocks = blocks.filter((b) => new Date(b.end) >= new Date());

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="h-4 w-4 text-primary/60" />
            <p className="text-xs uppercase tracking-widest text-primary/50 font-medium">Schedule Overview</p>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl text-primary tracking-tight">Availability Calendar</h1>
          <p className="text-muted-foreground mt-1 text-sm">View your weekly schedule and manage time blocks.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <a
            href="/doctor/schedule"
            className="flex items-center gap-2 border border-primary/20 text-primary rounded-2xl px-4 h-10 text-sm font-medium hover:bg-primary/5 transition-all"
          >
            <Settings className="h-4 w-4" />
            Edit Schedule
          </a>
          <button
            onClick={() => setShowBlockForm(!showBlockForm)}
            className="flex items-center gap-2 bg-primary text-white rounded-2xl px-4 h-10 text-sm font-medium hover:bg-primary/90 transition-all"
          >
            {showBlockForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showBlockForm ? "Cancel" : "Block Time"}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Working", sub: "days", value: activeDays },
          { label: "Blocks", sub: "upcoming", value: upcomingBlocks.length },
          { label: "Duration", sub: "min avg", value: avgDuration },
        ].map((stat, i) => (
          <Card key={i} className="border-primary/10 bg-white/60">
            <CardContent className="p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide leading-tight">{stat.label}</p>
              <p className="text-xl font-bold text-primary mt-1 leading-none">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Block Form */}
      {showBlockForm && (
        <div className="p-5 rounded-2xl border border-primary/20 bg-white shadow-sm space-y-4">
              <p className="text-sm font-medium text-primary">New Time Block</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Start Date", type: "date", field: "startDate", min: todayStr },
                  { label: "Start Time", type: "time", field: "startTime", min: undefined },
                  { label: "End Date", type: "date", field: "endDate", min: blockForm.startDate || todayStr },
                  { label: "End Time", type: "time", field: "endTime", min: undefined },
                ].map(({ label, type, field, min }) => (
                  <div key={field}>
                    <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">{label}</label>
                    <input
                      type={type}
                      min={min}
                      value={blockForm[field as keyof typeof blockForm]}
                      onChange={(e) => setBlockForm({ ...blockForm, [field]: e.target.value })}
                      className="w-full text-sm bg-white border border-primary/10 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 text-primary"
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Reason (Optional)</label>
                <input
                  type="text"
                  value={blockForm.reason}
                  onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })}
                  placeholder="e.g. Conference, Vacation, Personal leave"
                  className="w-full text-sm bg-white border border-primary/10 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 text-primary placeholder:text-muted-foreground/40"
                />
              </div>
              <button
                onClick={handleAddBlock}
                disabled={adding || !isBlockFormValid}
                className="w-full bg-primary text-white rounded-xl h-11 text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                {adding ? "Adding..." : "Confirm Block"}
              </button>
            </div>
      )}

      {/* Week Navigation + Day Strip */}
      <div className="rounded-2xl border border-primary/10 bg-white/60 p-3 sm:p-5">
        {/* Week nav */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            className="p-2 rounded-xl hover:bg-primary/5 text-muted-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="text-sm font-medium text-primary">
            {weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} –{" "}
            {weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            className="p-2 rounded-xl hover:bg-primary/5 text-muted-foreground transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Day pills */}
        <div className="grid grid-cols-7 gap-1.5">
          {weekDays.map((day, i) => {
            const dow = DOW_MAP[day.getDay()];
            const avail = availMap[dow];
            const hasHours = avail && !avail.isOff && avail.timeRanges.length > 0;
            const hasBlock = getDayBlocks(day).length > 0;
            const past = isPast(day);
            return (
              <button
                key={i}
                onClick={() => setSelectedDay(day)}
                className={`rounded-2xl p-2 text-center transition-all ${
                  isSelected(day)
                    ? "bg-primary text-white shadow-md shadow-primary/20"
                    : isToday(day)
                    ? "bg-primary/10 border border-primary/20 text-primary"
                    : past
                    ? "opacity-40 bg-muted/20 text-muted-foreground"
                    : hasHours
                    ? "bg-white border border-primary/10 hover:border-primary/30 hover:shadow-sm"
                    : "bg-muted/20 border border-dashed border-muted-foreground/15 text-muted-foreground"
                }`}
              >
                <p className={`text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider ${isSelected(day) ? "text-white/70" : "text-muted-foreground"}`}>
                  {day.toLocaleDateString("en-US", { weekday: "short" })}
                </p>
                <p className={`text-sm sm:text-base font-bold mt-0.5 ${isSelected(day) ? "text-white" : ""}`}>
                  {day.getDate()}
                </p>
                <div className="flex justify-center gap-0.5 mt-1">
                  {hasHours && (
                    <div className={`w-1 h-1 rounded-full ${isSelected(day) ? "bg-white/60" : "bg-emerald-400"}`} />
                  )}
                  {hasBlock && (
                    <div className={`w-1 h-1 rounded-full ${isSelected(day) ? "bg-white/60" : "bg-red-400"}`} />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected day detail */}
        <div className="mt-4 pt-4 border-t border-primary/5 space-y-3">
            <p className="text-sm font-semibold text-primary">
              {formatDateLabel(selectedDay)}
              {isToday(selectedDay) && (
                <span className="ml-2 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Today</span>
              )}
            </p>

            {(() => {
              const avail = getSelectedAvail();
              if (!avail || avail.isOff) {
                return (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/20 text-muted-foreground text-sm">
                    <Clock className="h-4 w-4 opacity-50" />
                    Day off — no consultations scheduled
                  </div>
                );
              }
              if (avail.timeRanges.length === 0) {
                return (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/20 text-muted-foreground text-sm">
                    <Clock className="h-4 w-4 opacity-50" />
                    No working hours set for this day
                  </div>
                );
              }
              return (
                <div className="space-y-1.5">
                  {avail.timeRanges.map((r, i) => (
                    <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                      <span className="text-sm text-emerald-800 font-medium">
                        {formatTime(r.startTime)} – {formatTime(r.endTime)}
                      </span>
                      <span className="text-xs text-emerald-600 ml-auto">{avail.duration}m slots</span>
                    </div>
                  ))}
                </div>
              );
            })()}

            {selectedBlocks.length > 0 && (
              <div className="space-y-1.5">
                {selectedBlocks.map((b) => (
                  <div key={b.id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-red-50 border border-red-100">
                    <Ban className="h-3.5 w-3.5 text-red-400 shrink-0" />
                    <span className="text-sm text-red-800 font-medium flex-1">
                      {formatDateTime(b.start)} — {formatDateTime(b.end)}
                      {b.reason && <span className="ml-1.5 text-red-600 font-normal">· {b.reason}</span>}
                    </span>
                    <button
                      onClick={() => handleDeleteBlock(b.id)}
                      disabled={deletingId === b.id}
                      className="p-1 rounded-lg text-red-300 hover:text-red-500 hover:bg-red-100 transition-colors"
                    >
                      {deletingId === b.id
                        ? <span className="h-3 w-3 border border-red-300 border-t-red-500 rounded-full animate-spin inline-block" />
                        : <Trash2 className="h-3 w-3" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>

      {/* All upcoming blocks list */}
      {upcomingBlocks.length > 0 && (
        <div className="rounded-2xl border border-primary/10 bg-white/60 p-4 sm:p-5 space-y-4">
          <div>
            <h2 className="text-lg font-display text-primary font-semibold">All Upcoming Blocks</h2>
            <p className="text-sm text-muted-foreground mt-0.5">All unavailable periods from today onward.</p>
          </div>
          <div className="space-y-2">
              {upcomingBlocks.map((block) => (
                <div
                  key={block.id}
                  className="flex items-center justify-between gap-3 px-3 py-3 rounded-2xl border border-primary/10 bg-white hover:border-primary/20 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                      <Ban className="h-3.5 w-3.5 text-red-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-primary truncate">
                        {formatDateTime(block.start)} — {formatDateTime(block.end)}
                      </p>
                      {block.reason && (
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md mt-0.5 inline-block">
                          {block.reason}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteBlock(block.id)}
                    disabled={deletingId === block.id}
                    className="p-2 rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                  >
                    {deletingId === block.id
                      ? <span className="h-3.5 w-3.5 border border-muted/30 border-t-muted-foreground rounded-full animate-spin inline-block" />
                      : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
