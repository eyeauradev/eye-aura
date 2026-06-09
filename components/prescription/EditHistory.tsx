"use client";

import { useState } from "react";
import { ChevronDown, Calendar, User, FileEdit, Eye } from "lucide-react";
import { GlassPanel } from "@/components/premium/glass-panel";
import type { PrescriptionHistoryEntry, UserDocument } from "@/types/firestore";
import { cn } from "@/lib/utils";
import { PremiumButton } from "@/components/premium";
import Link from "next/link";

export interface EditHistoryProps {
  /** Array of history entries in their original order (oldest first from Firestore) */
  history: PrescriptionHistoryEntry[];
  /** Map of doctorId to doctor details */
  doctors: Map<string, UserDocument>;
  /** Prescription ID for linking to historical views */
  prescriptionId: string;
}

/**
 * EditHistory Component
 * 
 * Displays prescription edit history in reverse chronological order (newest first).
 * Shows timestamp, doctor name, and changed fields for each entry.
 * Implements collapsible accordion UI with GlassPanel styling.
 * Marks the first entry (oldest) as "Original".
 * 
 * Requirements: 4.2, 4.3
 */
export function EditHistory({ history, doctors, prescriptionId }: EditHistoryProps) {
  // State to track which history entries are expanded
  const [expandedEntries, setExpandedEntries] = useState<Set<number>>(new Set());

  if (!history || history.length === 0) {
    return null;
  }

  // Display in reverse chronological order (newest first)
  const reversedHistory = [...history].reverse();

  const toggleEntry = (index: number) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedEntries(newExpanded);
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (date: Date): string => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getDoctorName = (doctorId: string): string => {
    const doctor = doctors.get(doctorId);
    return doctor?.displayName || "Unknown Doctor";
  };

  // Determine if this is the original entry (last in reversed array = first chronologically)
  const isOriginal = (index: number): boolean => {
    return index === reversedHistory.length - 1;
  };

  // Get changed fields by comparing with the previous entry (chronologically earlier)
  const getChangedFields = (index: number): string[] => {
    // For original entry, no changed fields
    if (isOriginal(index)) {
      return [];
    }

    const currentEntry = reversedHistory[index];
    const previousEntry = reversedHistory[index + 1];

    if (!currentEntry.data || !previousEntry?.data) {
      return [];
    }

    const changed: string[] = [];
    const fieldLabels: Record<string, string> = {
      rightEye: "Right Eye",
      leftEye: "Left Eye",
      pd: "Distance PD",
      nearPD: "Near PD",
      nearVisionRight: "Near Vision Right",
      nearVisionLeft: "Near Vision Left",
      findings: "Findings",
      diagnosis: "Diagnosis",
      medications: "Medications",
      eyeDrops: "Eye Drops",
      recommendations: "Recommendations",
      exercises: "Exercises",
      reviewAfter: "Review After",
      followUpRequired: "Follow-up Required",
      followUpDate: "Follow-up Date",
      consultationNotes: "Consultation Notes",
    };

    // Deep compare each field
    Object.keys(fieldLabels).forEach((key) => {
      const currentValue = (currentEntry.data as any)[key];
      const previousValue = (previousEntry.data as any)[key];
      
      // Use deep comparison for objects
      const currentStr = JSON.stringify(currentValue);
      const previousStr = JSON.stringify(previousValue);
      
      if (currentStr !== previousStr) {
        changed.push(fieldLabels[key]);
      }
    });

    return changed;
  };

  return (
    <GlassPanel padding="md" className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-primary/10">
        <FileEdit className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold text-primary">
          Edit History ({reversedHistory.length} {reversedHistory.length === 1 ? "entry" : "entries"})
        </h3>
      </div>

      <div className="space-y-3">
        {reversedHistory.map((entry, index) => {
          const isExpanded = expandedEntries.has(index);
          const changedFields = getChangedFields(index);
          const original = isOriginal(index);

          return (
            <div
              key={`${entry.savedAt}-${index}`}
              className="border border-primary/10 rounded-lg overflow-hidden bg-white/50"
            >
              {/* Header - Always visible */}
              <button
                onClick={() => toggleEntry(index)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-primary/5 transition-colors"
              >
                <div className="flex flex-col items-start gap-1 flex-1">
                  {/* Date and Doctor */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 text-sm font-medium text-primary">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {formatDate(entry.savedAt)} at {formatTime(entry.savedAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>Dr. {getDoctorName(entry.savedBy)}</span>
                    </div>
                    {original && (
                      <span className="px-2 py-0.5 text-xs font-semibold bg-primary/10 text-primary rounded-full">
                        Original
                      </span>
                    )}
                  </div>

                  {/* Changed fields (if not original) */}
                  {!original && changedFields.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Fields updated: {changedFields.join(", ")}
                    </div>
                  )}
                </div>

                {/* Expand/Collapse Icon */}
                <ChevronDown
                  className={cn(
                    "h-5 w-5 text-muted-foreground transition-transform",
                    isExpanded && "transform rotate-180"
                  )}
                />
              </button>

              {/* Details - Collapsible */}
              {isExpanded && (
                <div className="px-4 py-3 border-t border-primary/10 bg-primary/5 space-y-3">
                  {original ? (
                    <p className="text-sm text-muted-foreground">
                      This is the original prescription as created by Dr. {getDoctorName(entry.savedBy)}.
                    </p>
                  ) : (
                    <>
                      {changedFields.length > 0 ? (
                        <div>
                          <p className="text-sm font-medium text-primary mb-2">
                            The following fields were updated:
                          </p>
                          <ul className="list-disc list-inside space-y-1">
                            {changedFields.map((field) => (
                              <li key={field} className="text-sm text-muted-foreground">
                                {field}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No specific field changes detected.
                        </p>
                      )}
                    </>
                  )}

                  {/* View Full Prescription Button */}
                  <div className="pt-2 border-t border-primary/10 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Saved on {formatDate(entry.savedAt)} at {formatTime(entry.savedAt)}
                    </p>
                    <Link href={`/doctor/prescriptions/${prescriptionId}/history/${index}`}>
                      <PremiumButton
                        variant="outline"
                        size="sm"
                        icon={<Eye className="h-3 w-3" />}
                      >
                        View Full Prescription
                      </PremiumButton>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </GlassPanel>
  );
}
