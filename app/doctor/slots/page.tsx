"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { doctorSlotsService } from "@/services/firestore";
import type { DoctorSlotDocument } from "@/types/firestore";
import { Calendar, Clock, Plus, Trash2, Edit2, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionContainer } from "@/components/section-container";

export default function DoctorSlotsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<DoctorSlotDocument[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    async function loadSlots() {
      if (!user) return;

      try {
        setLoading(true);
        const startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 1);
        const doctorSlots = await doctorSlotsService.getByDoctorId(user.id, startDate, endDate);
        setSlots(doctorSlots);
      } catch (error) {
        console.error("Error loading slots:", error);
      } finally {
        setLoading(false);
      }
    }

    loadSlots();
  }, [user]);

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm("Are you sure you want to delete this slot?")) return;

    try {
      await doctorSlotsService.delete(slotId);
      setSlots(slots.filter(s => s.id !== slotId));
    } catch (error) {
      console.error("Error deleting slot:", error);
    }
  };

  const handleBlockSlot = async (slotId: string) => {
    try {
      await doctorSlotsService.update(slotId, { isBlocked: true });
      setSlots(slots.map(s => s.id === slotId ? { ...s, isBlocked: true } : s));
    } catch (error) {
      console.error("Error blocking slot:", error);
    }
  };

  const handleUnblockSlot = async (slotId: string) => {
    try {
      await doctorSlotsService.update(slotId, { isBlocked: false });
      setSlots(slots.map(s => s.id === slotId ? { ...s, isBlocked: false } : s));
    } catch (error) {
      console.error("Error unblocking slot:", error);
    }
  };

  const sortedSlots = slots.sort((a, b) => {
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  });

  const upcomingSlots = sortedSlots.filter(slot => new Date(slot.startTime) > new Date());
  const pastSlots = sortedSlots.filter(slot => new Date(slot.startTime) <= new Date());

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading slots...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl text-primary mb-2">Availability Slots</h1>
          <p className="text-xl text-muted-foreground">Manage your consultation schedule</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Slot
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-6 sm:grid-cols-3">
        <Card className="border-primary/10 bg-white/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Slots</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{slots.length}</div>
          </CardContent>
        </Card>
        <Card className="border-primary/10 bg-white/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Available</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {slots.filter(s => s.isAvailable && !s.isBlocked).length}
            </div>
          </CardContent>
        </Card>
        <Card className="border-primary/10 bg-white/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Blocked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {slots.filter(s => s.isBlocked).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Slots */}
      <SectionContainer>
        <h2 className="font-display text-2xl text-primary mb-6">Upcoming Slots</h2>
        {upcomingSlots.length > 0 ? (
          <div className="grid gap-4">
            {upcomingSlots.map((slot) => (
              <SlotCard
                key={slot.id}
                slot={slot}
                onDelete={handleDeleteSlot}
                onBlock={handleBlockSlot}
                onUnblock={handleUnblockSlot}
              />
            ))}
          </div>
        ) : (
          <Card className="border-primary/10 bg-primary/5">
            <CardContent className="p-8 text-center">
              <Calendar className="h-12 w-12 text-primary mx-auto mb-4 opacity-50" />
              <p className="text-base text-muted-foreground">No upcoming slots</p>
              <Button onClick={() => setShowCreateModal(true)} variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Slot
              </Button>
            </CardContent>
          </Card>
        )}
      </SectionContainer>

      {/* Past Slots */}
      {pastSlots.length > 0 && (
        <SectionContainer>
          <h2 className="font-display text-2xl text-primary mb-6">Past Slots</h2>
          <div className="grid gap-4">
            {pastSlots.map((slot) => (
              <SlotCard
                key={slot.id}
                slot={slot}
                onDelete={handleDeleteSlot}
                onBlock={handleBlockSlot}
                onUnblock={handleUnblockSlot}
              />
            ))}
          </div>
        </SectionContainer>
      )}

      {/* Create Slot Modal */}
      {showCreateModal && (
        <CreateSlotModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(newSlot) => {
            setSlots([...slots, newSlot]);
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
}

function SlotCard({
  slot,
  onDelete,
  onBlock,
  onUnblock,
}: {
  slot: DoctorSlotDocument;
  onDelete: (id: string) => void;
  onBlock: (id: string) => void;
  onUnblock: (id: string) => void;
}) {
  const startTime = new Date(slot.startTime);
  const endTime = new Date(slot.endTime);
  const isPast = endTime < new Date();

  return (
    <Card className={`border-primary/10 ${slot.isBlocked ? "opacity-60" : ""} ${isPast ? "opacity-50" : ""}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium text-primary">
                  {startTime.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {startTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} -{" "}
                  {endTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {slot.isAvailable && !slot.isBlocked && (
                <Badge className="bg-green-100 text-green-800 border-green-200">Available</Badge>
              )}
              {slot.isBlocked && (
                <Badge className="bg-red-100 text-red-800 border-red-200">Blocked</Badge>
              )}
              {!slot.isAvailable && !slot.isBlocked && (
                <Badge className="bg-gray-100 text-gray-800 border-gray-200">Booked</Badge>
              )}
              {isPast && (
                <Badge>Past</Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isPast && (
              <>
                {slot.isBlocked ? (
                  <Button
                    variant="outline"
                    size="default"
                    onClick={() => onUnblock(slot.id)}
                  >
                    Unblock
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="default"
                    onClick={() => onBlock(slot.id)}
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Block
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="default"
                  onClick={() => onDelete(slot.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateSlotModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (slot: DoctorSlotDocument) => void;
}) {
  const { user } = useAuth();
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [duration, setDuration] = useState(30); // consultation duration in minutes
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !date || !startTime || !endTime) return;

    try {
      setLoading(true);

      const startDateTime = new Date(`${date}T${startTime}`);
      const endDateTime = new Date(`${date}T${endTime}`);

      // Validate end time is after start time
      if (endDateTime <= startDateTime) {
        alert("End time must be after start time");
        setLoading(false);
        return;
      }

      const slot: DoctorSlotDocument = {
        id: crypto.randomUUID(),
        doctorId: user.id,
        startTime: startDateTime,
        endTime: endDateTime,
        isAvailable: true,
        isBlocked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await doctorSlotsService.create(slot);
      onCreated(slot);
    } catch (error) {
      console.error("Error creating slot:", error);
      alert("Failed to create slot. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create Availability Slot</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2 border border-primary/10 rounded-2xl bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-2">Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-2 border border-primary/10 rounded-2xl bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-2">End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-4 py-2 border border-primary/10 rounded-2xl bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">Consultation Duration (minutes)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                min="15"
                step="5"
                className="w-full px-4 py-2 border border-primary/10 rounded-2xl bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Creating..." : "Create Slot"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
