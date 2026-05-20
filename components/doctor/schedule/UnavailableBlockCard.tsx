"use client";

import { useState } from "react";
import { Plus, Trash2, CalendarOff, X, Ban } from "lucide-react";
import type { DoctorBlockDocument } from "@/types/firestore";

interface UnavailableBlockCardProps {
  blocks: DoctorBlockDocument[];
  onAdd: (data: { start: Date; end: Date; reason: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

interface BlockFormData {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  reason: string;
}

const emptyForm: BlockFormData = {
  startDate: "",
  startTime: "09:00",
  endDate: "",
  endTime: "18:00",
  reason: "",
};

const todayStr = () => new Date().toISOString().split("T")[0];

export function UnavailableBlockCard({ blocks, onAdd, onDelete }: UnavailableBlockCardProps) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<BlockFormData>({ ...emptyForm, startDate: todayStr(), endDate: todayStr() });
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!form.startDate || !form.endDate) return;
    setAdding(true);
    try {
      const start = new Date(`${form.startDate}T${form.startTime}`);
      const end = new Date(`${form.endDate}T${form.endTime}`);
      await onAdd({ start, end, reason: form.reason });
      setForm({ ...emptyForm, startDate: todayStr(), endDate: todayStr() });
      setShowForm(false);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const formatTime = (date: Date) =>
    new Date(date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  const isSameDay = (a: Date, b: Date) =>
    new Date(a).toDateString() === new Date(b).toDateString();

  const isFormValid = form.startDate && form.endDate && new Date(`${form.startDate}T${form.startTime}`) < new Date(`${form.endDate}T${form.endTime}`);

  return (
    <div className="space-y-5">
      {/* Section Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-display text-primary font-semibold">Unavailable Periods</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Add vacations, breaks, or consultation pauses.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-primary text-white rounded-2xl h-10 px-4 text-sm font-medium hover:bg-primary/90 transition-all shrink-0"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Cancel" : "Add Block"}
        </button>
      </div>

      {/* Add Form */}
      <div className={`overflow-hidden transition-all duration-200 ${showForm ? "max-h-[480px] opacity-100" : "max-h-0 opacity-0"}`}>
            <div className="p-5 rounded-2xl border border-primary/20 bg-white shadow-sm space-y-4">
              <p className="text-sm font-medium text-primary">New Unavailable Block</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={form.startDate}
                    min={todayStr()}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full text-sm bg-white border border-primary/10 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 text-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="w-full text-sm bg-white border border-primary/10 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 text-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={form.endDate}
                    min={form.startDate || todayStr()}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full text-sm bg-white border border-primary/10 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 text-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="w-full text-sm bg-white border border-primary/10 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 text-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                  Reason (Optional)
                </label>
                <input
                  type="text"
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="e.g. Conference, Vacation, Personal leave"
                  className="w-full text-sm bg-white border border-primary/10 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 text-primary placeholder:text-muted-foreground/40"
                />
              </div>

              <button
                onClick={handleAdd}
                disabled={adding || !isFormValid}
                className="w-full bg-primary text-white rounded-xl h-11 text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                {adding ? "Adding..." : "Confirm Block"}
              </button>
            </div>
      </div>

      {/* Blocks List */}
      {blocks.length === 0 ? (
        <div className="text-center py-10 rounded-2xl border border-dashed border-primary/10 bg-primary/5">
          <CalendarOff className="h-8 w-8 text-primary/20 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No unavailable periods</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Add blocks for holidays, vacations, or breaks
          </p>
        </div>
      ) : (
        <div className="space-y-2">
            {blocks.map((block) => (
              <div
                key={block.id}
                className="flex items-center justify-between gap-4 px-4 py-3.5 rounded-2xl border border-primary/10 bg-white hover:border-primary/20 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                    <Ban className="h-3.5 w-3.5 text-red-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-primary truncate">
                      {isSameDay(block.start, block.end)
                        ? formatDate(block.start)
                        : `${formatDate(block.start)} → ${formatDate(block.end)}`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatTime(block.start)} — {formatTime(block.end)}
                      {block.reason && (
                        <span className="ml-1.5 px-1.5 py-0.5 bg-muted rounded-md text-[10px]">
                          {block.reason}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(block.id)}
                  disabled={deletingId === block.id}
                  className="p-2 rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors shrink-0 disabled:opacity-40"
                  aria-label="Delete block"
                >
                  {deletingId === block.id ? (
                    <span className="h-3.5 w-3.5 border-2 border-muted/30 border-t-muted-foreground rounded-full animate-spin inline-block" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
