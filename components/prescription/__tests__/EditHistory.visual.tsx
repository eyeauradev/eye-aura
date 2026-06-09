/**
 * Visual Test File for EditHistory Component
 * 
 * This file is for manual visual testing during development.
 * To use: Import this component in a test page and render with sample data.
 */

"use client";

import { EditHistory } from "../EditHistory";
import type { PrescriptionHistoryEntry, UserDocument } from "@/types/firestore";

export function EditHistoryVisualTest() {
  // Sample doctor data
  const doctors = new Map<string, UserDocument>([
    [
      "doctor-1",
      {
        id: "doctor-1",
        email: "sarah.johnson@eyeaura.com",
        displayName: "Sarah Johnson",
        role: "doctor",
        isActive: true,
        isSuspended: false,
        onboarding: {
          patientCompleted: false,
          doctorCompleted: true,
        },
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      },
    ],
    [
      "doctor-2",
      {
        id: "doctor-2",
        email: "john.doe@eyeaura.com",
        displayName: "John Doe",
        role: "doctor",
        isActive: true,
        isSuspended: false,
        onboarding: {
          patientCompleted: false,
          doctorCompleted: true,
        },
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      },
    ],
  ]);

  // Sample history entries (in chronological order as stored in Firestore)
  const historyWithMultipleEdits: PrescriptionHistoryEntry[] = [
    {
      savedAt: new Date("2025-01-08T15:45:00"),
      savedBy: "doctor-1",
      data: {
        rightEye: { sph: "-2.00", cyl: "-0.50", axis: "90", va: "6/6", remarks: "" },
        leftEye: { sph: "-2.25", cyl: "-0.75", axis: "85", va: "6/6", remarks: "" },
        pd: "62",
        findings: "Mild myopia with astigmatism",
        diagnosis: "Myopia with regular astigmatism",
        medications: "Blue-light blocking glasses recommended",
        eyeDrops: "None",
        recommendations: "Use glasses for distance viewing",
        exercises: "20-20-20 rule",
        followUpRequired: false,
      },
    },
    {
      savedAt: new Date("2025-01-10T10:15:00"),
      savedBy: "doctor-1",
      data: {
        rightEye: { sph: "-2.00", cyl: "-0.50", axis: "90", va: "6/6", remarks: "" },
        leftEye: { sph: "-2.25", cyl: "-0.75", axis: "85", va: "6/6", remarks: "" },
        pd: "62",
        findings: "Mild myopia with astigmatism",
        diagnosis: "Myopia with regular astigmatism. Patient also shows signs of digital eye strain.",
        medications: "Blue-light blocking glasses recommended",
        eyeDrops: "Artificial tears as needed",
        recommendations: "Use glasses for distance viewing. Take regular breaks from screen time.",
        exercises: "20-20-20 rule, palming exercise",
        followUpRequired: true,
        followUpDate: new Date("2025-02-10"),
      },
    },
    {
      savedAt: new Date("2025-01-15T14:30:00"),
      savedBy: "doctor-2",
      data: {
        rightEye: { sph: "-2.00", cyl: "-0.50", axis: "90", va: "6/6", remarks: "" },
        leftEye: { sph: "-2.25", cyl: "-0.75", axis: "85", va: "6/6", remarks: "" },
        pd: "62",
        nearPD: "60",
        findings: "Mild myopia with astigmatism. Digital eye strain noted.",
        diagnosis: "Myopia with regular astigmatism. Patient also shows signs of digital eye strain.",
        medications: "Blue-light blocking glasses recommended for computer work",
        eyeDrops: "Artificial tears 3-4 times daily",
        recommendations: "Use glasses for distance viewing. Take regular breaks from screen time. Consider anti-reflective coating.",
        exercises: "20-20-20 rule, palming exercise, eye rotations",
        followUpRequired: true,
        followUpDate: new Date("2025-02-10"),
      },
    },
  ];

  const historyWithSingleEdit: PrescriptionHistoryEntry[] = [
    {
      savedAt: new Date("2025-01-08T15:45:00"),
      savedBy: "doctor-1",
      data: {
        rightEye: { sph: "-1.50", cyl: "-0.25", axis: "180", va: "6/6", remarks: "" },
        leftEye: { sph: "-1.75", cyl: "-0.50", axis: "175", va: "6/6", remarks: "" },
        pd: "64",
        findings: "Mild myopia",
        diagnosis: "Simple myopia",
        medications: "None",
        eyeDrops: "None",
        recommendations: "Wear glasses as prescribed",
        exercises: "None",
        followUpRequired: false,
      },
    },
    {
      savedAt: new Date("2025-01-09T11:20:00"),
      savedBy: "doctor-1",
      data: {
        rightEye: { sph: "-1.50", cyl: "-0.25", axis: "180", va: "6/6", remarks: "" },
        leftEye: { sph: "-1.75", cyl: "-0.50", axis: "175", va: "6/6", remarks: "" },
        pd: "64",
        findings: "Mild myopia",
        diagnosis: "Simple myopia",
        medications: "None",
        eyeDrops: "Lubricating drops as needed",
        recommendations: "Wear glasses as prescribed. Stay hydrated.",
        exercises: "Blinking exercises",
        followUpRequired: true,
        followUpDate: new Date("2025-03-09"),
      },
    },
  ];

  const historyOriginalOnly: PrescriptionHistoryEntry[] = [
    {
      savedAt: new Date("2025-01-08T15:45:00"),
      savedBy: "doctor-1",
      data: {
        rightEye: { sph: "-1.00", cyl: "0.00", axis: "0", va: "6/6", remarks: "" },
        leftEye: { sph: "-1.00", cyl: "0.00", axis: "0", va: "6/6", remarks: "" },
        pd: "63",
        findings: "Very mild myopia",
        diagnosis: "Low myopia",
        medications: "Glasses for distance",
        eyeDrops: "None",
        recommendations: "Use as needed for distance viewing",
        exercises: "Regular eye rest",
        followUpRequired: false,
      },
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F4EF] to-[#DDE5DF] p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-primary mb-8">EditHistory Component Visual Tests</h1>

        {/* Test Case 1: Multiple Edits */}
        <div>
          <h2 className="text-xl font-semibold text-primary mb-4">Test Case 1: Multiple Edits (3 entries)</h2>
          <EditHistory history={historyWithMultipleEdits} doctors={doctors} />
        </div>

        {/* Test Case 2: Single Edit */}
        <div>
          <h2 className="text-xl font-semibold text-primary mb-4">Test Case 2: Single Edit (2 entries)</h2>
          <EditHistory history={historyWithSingleEdit} doctors={doctors} />
        </div>

        {/* Test Case 3: Original Only */}
        <div>
          <h2 className="text-xl font-semibold text-primary mb-4">Test Case 3: Original Only (1 entry)</h2>
          <EditHistory history={historyOriginalOnly} doctors={doctors} />
        </div>

        {/* Test Case 4: Empty History */}
        <div>
          <h2 className="text-xl font-semibold text-primary mb-4">Test Case 4: Empty History (should render nothing)</h2>
          <EditHistory history={[]} doctors={doctors} />
          <p className="text-sm text-muted-foreground mt-2">
            (If you see this text but nothing above, the component correctly returns null for empty history)
          </p>
        </div>

        {/* Test Case 5: Missing Doctor */}
        <div>
          <h2 className="text-xl font-semibold text-primary mb-4">Test Case 5: Missing Doctor Info</h2>
          <EditHistory
            history={[
              {
                savedAt: new Date("2025-01-08T15:45:00"),
                savedBy: "unknown-doctor-id",
                data: {
                  rightEye: { sph: "-1.00", cyl: "0.00", axis: "0", va: "6/6", remarks: "" },
                  leftEye: { sph: "-1.00", cyl: "0.00", axis: "0", va: "6/6", remarks: "" },
                  pd: "63",
                  findings: "Test",
                  diagnosis: "Test",
                  medications: "Test",
                  eyeDrops: "None",
                  recommendations: "Test",
                  exercises: "Test",
                  followUpRequired: false,
                },
              },
            ]}
            doctors={doctors}
          />
        </div>
      </div>
    </div>
  );
}
