"use client";

import { useParams, useRouter } from "next/navigation";
import { PrescriptionForm } from "@/components/prescription/PrescriptionForm";
import { ArrowLeft } from "lucide-react";
import { PremiumButton } from "@/components/premium";
import Link from "next/link";

/**
 * Edit Prescription Page
 * 
 * This page allows doctors to edit existing prescriptions.
 * It loads the prescription by ID and pre-fills the PrescriptionForm component.
 * 
 * Route: /doctor/prescriptions/[id]/edit
 * 
 * Requirements satisfied:
 * - 3.1: Edit Prescription button navigation
 * - 3.2: Editable form with pre-filled data
 * - 3.3: Form validation
 * - 3.4: Save updates to database
 * - 3.5: Success confirmation and redirect
 */
export default function EditPrescriptionPage() {
  const params = useParams();
  const router = useRouter();
  const prescriptionId = params.id as string;

  /**
   * Success handler
   * Called after prescription is successfully updated
   * Navigates back to prescription detail page
   */
  const handleSuccess = (id: string) => {
    router.push(`/doctor/prescriptions/${id}`);
  };

  return (
    <div className="space-y-6">
      {/* Back Navigation */}
      <div>
        <Link href={`/doctor/prescriptions/${prescriptionId}`}>
          <PremiumButton variant="ghost" icon={<ArrowLeft className="h-4 w-4" />}>
            Back to Prescription
          </PremiumButton>
        </Link>
      </div>

      {/* Prescription Form in Edit Mode */}
      <PrescriptionForm
        mode="edit"
        prescriptionId={prescriptionId}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
