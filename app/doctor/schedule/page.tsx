"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { doctorAvailabilityService } from "@/services/firestore/doctor-availability.service";
import type { DoctorAvailabilityDocument, DayOfWeek, TimeRange } from "@/types/firestore";
import { Clock, Plus, Trash2, Copy, Save, X, Calendar, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

const DAYS: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
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

export default function DoctorSchedulePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copyFromDay, setCopyFromDay] = useState<DayOfWeek | null>(null);
  const [selectedDays, setSelectedDays] = useState<Set<DayOfWeek>>(new Set());
  const [schedules, setSchedules] = useState<Record<DayOfWeek, DaySchedule>>(() => {
    return DAYS.reduce((acc, day) => {
      acc[day] = {
        dayOfWeek: day,
        timeRanges: [],
        isOff: false,
        duration: 30,
      };
      return acc;
    }, {} as Record<DayOfWeek, DaySchedule>);
  });

  useEffect(() => {
    if (!user) return;

    async function loadAvailability() {
      if (!user) return;
      
      try {
        setLoading(true);
        const availabilities = await doctorAvailabilityService.getByDoctorId(user.id);
        
        const newSchedules = { ...schedules };
        availabilities.forEach((availability) => {
          newSchedules[availability.dayOfWeek] = {
            dayOfWeek: availability.dayOfWeek,
            timeRanges: availability.timeRanges,
            isOff: availability.isOff,
            duration: availability.duration,
          };
        });
        
        setSchedules(newSchedules);
      } catch (error) {
        console.error("Failed to load availability:", error);
      } finally {
        setLoading(false);
      }
    }

    loadAvailability();
  }, [user]);

  const addTimeRange = (day: DayOfWeek) => {
    setSchedules((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        timeRanges: [...prev[day].timeRanges, { startTime: "09:00", endTime: "17:00" }],
      },
    }));
  };

  const removeTimeRange = (day: DayOfWeek, index: number) => {
    setSchedules((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        timeRanges: prev[day].timeRanges.filter((_, i) => i !== index),
      },
    }));
  };

  const updateTimeRange = (day: DayOfWeek, index: number, field: keyof TimeRange, value: string) => {
    setSchedules((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        timeRanges: prev[day].timeRanges.map((range, i) =>
          i === index ? { ...range, [field]: value } : range
        ),
      },
    }));
  };

  const toggleOffDay = (day: DayOfWeek, isOff: boolean) => {
    setSchedules((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        isOff,
        timeRanges: isOff ? [] : prev[day].timeRanges,
      },
    }));
  };

  const updateDuration = (day: DayOfWeek, duration: number) => {
    setSchedules((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        duration,
      },
    }));
  };

  const copySchedule = (fromDay: DayOfWeek, toDay: DayOfWeek) => {
    setSchedules((prev) => ({
      ...prev,
      [toDay]: {
        ...prev[toDay],
        timeRanges: [...prev[fromDay].timeRanges],
        isOff: prev[fromDay].isOff,
        duration: prev[fromDay].duration,
      },
    }));
  };

  const openCopyDialog = (fromDay: DayOfWeek) => {
    setCopyFromDay(fromDay);
    setSelectedDays(new Set());
    setCopyDialogOpen(true);
  };

  const handleCopyToSelected = () => {
    if (!copyFromDay) return;
    
    selectedDays.forEach((toDay) => {
      if (toDay !== copyFromDay) {
        copySchedule(copyFromDay, toDay);
      }
    });
    
    setCopyDialogOpen(false);
    setSelectedDays(new Set());
    setCopyFromDay(null);
  };

  const toggleDaySelection = (day: DayOfWeek) => {
    setSelectedDays((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(day)) {
        newSet.delete(day);
      } else {
        newSet.add(day);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (!copyFromDay) return;
    
    const allOtherDays = DAYS.filter((d) => d !== copyFromDay);
    if (selectedDays.size === allOtherDays.length) {
      setSelectedDays(new Set());
    } else {
      setSelectedDays(new Set(allOtherDays));
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);
      
      for (const day of DAYS) {
        const schedule = schedules[day];
        await doctorAvailabilityService.upsertAvailability(
          user.id,
          day,
          schedule.timeRanges,
          schedule.duration,
          schedule.isOff
        );
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Failed to save availability:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl sm:text-4xl text-primary mb-1">Weekly Schedule</h1>
        <p className="text-sm sm:text-sm sm:text-xl text-muted-foreground">
          Configure your weekly working hours and availability
        </p>
      </div>

      
        <Card className="border-primary/10">
          <CardHeader className="p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Availability Settings</CardTitle>
                <CardDescription>
                  Set your working hours for each day of the week
                </CardDescription>
              </div>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-primary text-white"
              >
                {saving ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : saved ? (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Saved
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Schedule
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {DAYS.map((day) => {
              const schedule = schedules[day];
              return (
                <div key={day} className="p-6 rounded-xl border border-primary/10 bg-white/50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <h3 className="font-display text-xl text-primary font-medium">
                        {DAY_LABELS[day]}
                      </h3>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={!schedule.isOff}
                          onCheckedChange={(checked) => toggleOffDay(day, !checked)}
                          className="data-[state=checked]:bg-primary"
                        />
                        <span className="text-sm text-muted-foreground">
                          {schedule.isOff ? "Off" : "Available"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 mr-4">
                        <Label htmlFor={`duration-${day}`} className="text-sm">
                          Duration:
                        </Label>
                        <Input
                          id={`duration-${day}`}
                          type="number"
                          value={schedule.duration}
                          onChange={(e) => updateDuration(day, parseInt(e.target.value) || 30)}
                          className="w-20 h-8 text-sm"
                          min="15"
                          max="120"
                          step="15"
                          disabled={schedule.isOff}
                        />
                        <span className="text-sm text-muted-foreground">min</span>
                      </div>
                    </div>
                  </div>

                  {schedule.isOff ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Marked as day off</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {schedule.timeRanges.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No time ranges configured</p>
                          <Button
                            variant="ghost"
                            onClick={() => addTimeRange(day)}
                            className="mt-2"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Time Range
                          </Button>
                        </div>
                      ) : (
                        schedule.timeRanges.map((range, index) => (
                          <div key={index} className="flex items-center gap-3">
                            <div className="flex-1">
                              <Label htmlFor={`start-${day}-${index}`} className="text-xs text-muted-foreground mb-1">
                                Start
                              </Label>
                              <Input
                                id={`start-${day}-${index}`}
                                type="time"
                                value={range.startTime}
                                onChange={(e) => updateTimeRange(day, index, "startTime", e.target.value)}
                                className="h-9"
                              />
                            </div>
                            <div className="flex-1">
                              <Label htmlFor={`end-${day}-${index}`} className="text-xs text-muted-foreground mb-1">
                                End
                              </Label>
                              <Input
                                id={`end-${day}-${index}`}
                                type="time"
                                value={range.endTime}
                                onChange={(e) => updateTimeRange(day, index, "endTime", e.target.value)}
                                className="h-9"
                              />
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeTimeRange(day, index)}
                              className="h-9 w-9 text-muted-foreground hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      )}
                      {schedule.timeRanges.length > 0 && (
                        <Button
                          variant="outline"
                          onClick={() => addTimeRange(day)}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Another Time Range
                        </Button>
                      )}
                    </div>
                  )}

                  {schedule.timeRanges.length > 0 && (
                    <div className="flex items-center justify-end pt-4 border-t border-primary/10">
                      <Dialog open={copyDialogOpen && copyFromDay === day} onOpenChange={(open) => {
                        setCopyDialogOpen(open);
                        if (!open) {
                          setCopyFromDay(null);
                          setSelectedDays(new Set());
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            onClick={() => openCopyDialog(day)}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Schedule
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Copy Schedule from {DAY_LABELS[day]}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id="select-all"
                                checked={selectedDays.size === DAYS.filter((d) => d !== day).length}
                                onCheckedChange={toggleSelectAll}
                              />
                              <Label htmlFor="select-all" className="font-medium">
                                Select All Days
                              </Label>
                            </div>
                            <div className="space-y-2">
                              {DAYS.filter((d) => d !== day).map((d) => (
                                <div key={d} className="flex items-center gap-2">
                                  <Checkbox
                                    id={`day-${d}`}
                                    checked={selectedDays.has(d)}
                                    onCheckedChange={() => toggleDaySelection(d)}
                                  />
                                  <Label htmlFor={`day-${d}`} className="cursor-pointer">
                                    {DAY_LABELS[d]}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setCopyDialogOpen(false);
                                setSelectedDays(new Set());
                                setCopyFromDay(null);
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleCopyToSelected}
                              disabled={selectedDays.size === 0}
                              className="bg-primary text-white"
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copy to Selected ({selectedDays.size})
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      
    </div>
  );
}
