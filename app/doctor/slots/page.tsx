"use client";

import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useAuth } from "@/contexts/auth-context";
import { doctorAvailabilityService } from "@/services/firestore/doctor-availability.service";
import { doctorBlocksService } from "@/services/firestore/doctor-blocks.service";
import { appointmentsService } from "@/services/firestore/appointments.service";
import type { DoctorAvailabilityDocument, DoctorBlockDocument } from "@/types/firestore";
import { Calendar, Clock, Plus, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function DoctorSlotsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [calendarView, setCalendarView] = useState("timeGridWeek");

  useEffect(() => {
    const updateView = () => {
      setCalendarView(window.innerWidth < 640 ? "timeGridDay" : "timeGridWeek");
    };
    updateView();
    window.addEventListener("resize", updateView);
    return () => window.removeEventListener("resize", updateView);
  }, []);
  const [availability, setAvailability] = useState<DoctorAvailabilityDocument[]>([]);
  const [blocks, setBlocks] = useState<DoctorBlockDocument[]>([]);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [blockStart, setBlockStart] = useState<Date | null>(null);
  const [blockEnd, setBlockEnd] = useState<Date | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [blockRepeatWeekly, setBlockRepeatWeekly] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!user) return;

      try {
        setLoading(true);
        
        // Load availability
        const availData = await doctorAvailabilityService.getByDoctorId(user.id);
        setAvailability(availData);

        // Load blocks for the next 3 months
        const startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 3);
        const blockData = await doctorBlocksService.getByDoctorId(user.id, startDate, endDate);
        setBlocks(blockData);
      } catch (error) {
        console.error("Error loading schedule data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  const handleDateSelect = (selectInfo: any) => {
    setBlockStart(selectInfo.start);
    setBlockEnd(selectInfo.end);
    setBlockReason("");
    setBlockRepeatWeekly(false);
    setShowBlockDialog(true);
  };

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !blockStart || !blockEnd || !blockReason) return;

    try {
      await doctorBlocksService.create({
        doctorId: user.id,
        start: blockStart,
        end: blockEnd,
        reason: blockReason,
        repeatWeekly: blockRepeatWeekly,
      });

      // Reload blocks
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3);
      const blockData = await doctorBlocksService.getByDoctorId(user.id, startDate, endDate);
      setBlocks(blockData);

      setShowBlockDialog(false);
    } catch (error) {
      console.error("Error creating block:", error);
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    if (!confirm("Are you sure you want to delete this block?")) return;

    try {
      await doctorBlocksService.delete(blockId);
      setBlocks(blocks.filter(b => b.id !== blockId));
    } catch (error) {
      console.error("Error deleting block:", error);
    }
  };

  // Generate calendar events from availability and blocks
  const generateCalendarEvents = () => {
    const events: any[] = [];
    const today = new Date();
    const threeMonthsLater = new Date();
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

    // Generate availability events from weekly schedule
    availability.forEach((avail) => {
      if (avail.isOff) return;

      const dayMap: Record<string, number> = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
      };

      const dayOfWeek = dayMap[avail.dayOfWeek];
      
      // Generate recurring events for the next 3 months
      let currentDate = new Date(today);
      while (currentDate <= threeMonthsLater) {
        if (currentDate.getDay() === dayOfWeek) {
          avail.timeRanges.forEach((range) => {
            const [startHours, startMinutes] = range.startTime.split(":").map(Number);
            const [endHours, endMinutes] = range.endTime.split(":").map(Number);

            const startDate = new Date(currentDate);
            startDate.setHours(startHours, startMinutes, 0, 0);

            const endDate = new Date(currentDate);
            endDate.setHours(endHours, endMinutes, 0, 0);

            events.push({
              title: "Available",
              start: startDate,
              end: endDate,
              backgroundColor: "#10B981",
              borderColor: "#10B981",
              display: "background",
            });
          });
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

    // Add block events
    blocks.forEach((block) => {
      events.push({
        title: block.reason,
        start: block.start,
        end: block.end,
        backgroundColor: "#EF4444",
        borderColor: "#EF4444",
        extendedProps: {
          blockId: block.id,
          isBlock: true,
        },
      });
    });

    return events;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl text-primary mb-1">Calendar</h1>
          <p className="text-base sm:text-xl text-muted-foreground">View and manage your schedule</p>
        </div>
        <div className="flex gap-2 sm:gap-3">
          <Button variant="outline" asChild>
            <a href="/doctor/schedule">
              <Calendar className="h-4 w-4 mr-2" />
              Edit Schedule
            </a>
          </Button>
          <Button onClick={() => setShowBlockDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Block Time
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-6 sm:grid-cols-3">
        <Card className="border-primary/10 bg-white/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Schedule Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {availability.filter(a => !a.isOff).length}
            </div>
          </CardContent>
        </Card>
        <Card className="border-primary/10 bg-white/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Blocked Periods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{blocks.length}</div>
          </CardContent>
        </Card>
        <Card className="border-primary/10 bg-white/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {availability.length > 0 
                ? Math.round(availability.reduce((sum, a) => sum + a.duration, 0) / availability.length)
                : 30}
              <span className="text-lg text-muted-foreground ml-1">min</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <Card className="border-primary/10">
        <CardContent className="p-3 sm:p-6">
          <div className="overflow-x-auto">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              key={calendarView}
              initialView={calendarView}
              headerToolbar={calendarView === "timeGridDay" ? {
                left: "prev,next",
                center: "title",
                right: "timeGridDay,timeGridWeek",
              } : {
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek,timeGridDay",
              }}
              selectable={true}
              select={handleDateSelect}
              editable={true}
              eventClick={(info) => {
                if (info.event.extendedProps?.isBlock) {
                  if (confirm(`Delete this block: ${info.event.title}?`)) {
                    handleDeleteBlock(info.event.extendedProps.blockId);
                  }
                }
              }}
              events={generateCalendarEvents()}
              height="auto"
              slotMinTime="06:00:00"
              slotMaxTime="22:00:00"
              allDaySlot={false}
              expandRows={true}
              stickyHeaderDates={true}
              dayMinWidth={calendarView === "timeGridWeek" ? 60 : undefined}
              businessHours={{
                daysOfWeek: availability
                  .filter(a => !a.isOff)
                  .map(a => {
                    const dayMap: Record<string, number> = {
                      sunday: 0,
                      monday: 1,
                      tuesday: 2,
                      wednesday: 3,
                      thursday: 4,
                      friday: 5,
                      saturday: 6,
                    };
                    return dayMap[a.dayOfWeek];
                  }),
              }}
              eventDidMount={(info) => {
                if (info.event.extendedProps?.isBlock) {
                  info.el.title = `Click to delete: ${info.event.title}`;
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Block Time Dialog */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block Time Range</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateBlock} className="space-y-4">
            {blockStart && (
              <div>
                <Label>Start Time</Label>
                <Input
                  type="datetime-local"
                  value={blockStart.toISOString().slice(0, 16)}
                  onChange={(e) => setBlockStart(new Date(e.target.value))}
                  disabled
                />
              </div>
            )}
            {blockEnd && (
              <div>
                <Label>End Time</Label>
                <Input
                  type="datetime-local"
                  value={blockEnd.toISOString().slice(0, 16)}
                  onChange={(e) => setBlockEnd(new Date(e.target.value))}
                  disabled
                />
              </div>
            )}
            <div>
              <Label>Reason</Label>
              <Input
                placeholder="e.g., Lunch break, Emergency, Vacation"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="repeat"
                checked={blockRepeatWeekly}
                onChange={(e) => setBlockRepeatWeekly(e.target.checked)}
                className="rounded border-primary/20"
              />
              <Label htmlFor="repeat" className="text-sm">
                Repeat weekly
              </Label>
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowBlockDialog(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                <Ban className="h-4 w-4 mr-2" />
                Block Time
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
