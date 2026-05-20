import { notFound } from "next/navigation";
import { getFirebaseAdmin } from "@/lib/firebase-admin";
import type { PrescriptionDocument } from "@/types/firestore";
import PrescriptionTemplate from "@/components/prescription/PrescriptionTemplate";

async function getPrescriptionData(id: string) {
  const admin = getFirebaseAdmin();
  if (!admin) return null;

  const db = admin.firestore();

  const prescriptionDoc = await db.collection("prescriptions").doc(id).get();
  if (!prescriptionDoc.exists) return null;

  const prescriptionData = prescriptionDoc.data();
  if (!prescriptionData) return null;

  const [patientDoc, doctorDoc] = await Promise.all([
    db.collection("users").doc(prescriptionData.patientId).get(),
    db.collection("users").doc(prescriptionData.doctorId).get(),
  ]);

  const patient = patientDoc.exists ? patientDoc.data() : null;
  const doctor = doctorDoc.exists ? doctorDoc.data() : null;

  const prescription: PrescriptionDocument = {
    id: prescriptionDoc.id,
    appointmentId: prescriptionData.appointmentId,
    patientId: prescriptionData.patientId,
    doctorId: prescriptionData.doctorId,
    rightEye: {
      sph: prescriptionData.rightEye?.sph || "",
      cyl: prescriptionData.rightEye?.cyl || "",
      axis: prescriptionData.rightEye?.axis || "",
      va: prescriptionData.rightEye?.va || "",
      remarks: prescriptionData.rightEye?.remarks || "",
    },
    leftEye: {
      sph: prescriptionData.leftEye?.sph || "",
      cyl: prescriptionData.leftEye?.cyl || "",
      axis: prescriptionData.leftEye?.axis || "",
      va: prescriptionData.leftEye?.va || "",
      remarks: prescriptionData.leftEye?.remarks || "",
    },
    pd: prescriptionData.pd || "",
    nearPD: prescriptionData.nearPD || "",
    nearVisionRight: prescriptionData.nearVisionRight || { add: "", va: "", remarks: "" },
    nearVisionLeft: prescriptionData.nearVisionLeft || { add: "", va: "", remarks: "" },
    patientAge: prescriptionData.patientAge || "",
    patientGender: prescriptionData.patientGender || "",
    referredBy: prescriptionData.referredBy || "",
    findings: prescriptionData.findings || "",
    diagnosis: prescriptionData.diagnosis || "",
    medications: prescriptionData.medications || "",
    eyeDrops: prescriptionData.eyeDrops || "",
    exercises: prescriptionData.exercises || "",
    recommendations: prescriptionData.recommendations || "",
    reviewAfter: prescriptionData.reviewAfter || "",
    followUpRequired: prescriptionData.followUpRequired || false,
    followUpDate: prescriptionData.followUpDate?.toDate(),
    consultationNotes: prescriptionData.consultationNotes || "",
    createdAt: prescriptionData.createdAt?.toDate() || new Date(),
    updatedAt: prescriptionData.updatedAt?.toDate() || new Date(),
  };

  return { prescription, patient, doctor };
}

export default async function PrescriptionPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const data = await getPrescriptionData(resolvedParams.id);

  if (!data) {
    notFound();
  }

  const { prescription, patient, doctor } = data;

  return (
    <div style={{ margin: 0, padding: 0, background: "#F9F5F0", minHeight: "100vh" }}>
      <PrescriptionTemplate
        prescriptionId={prescription.id}
        patientName={patient?.displayName || ""}
        patientAge={prescription.patientAge || ""}
        patientGender={prescription.patientGender || ""}
        patientPhone={patient?.phoneNumber || ""}
        date={new Date(prescription.createdAt).toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", year: "numeric" })}
        referredBy={prescription.referredBy || ""}
        doctorName={doctor?.displayName || ""}
        rightEye={{ sph: prescription.rightEye.sph, cyl: prescription.rightEye.cyl, axis: prescription.rightEye.axis, va: prescription.rightEye.va, remarks: prescription.rightEye.remarks || "" } as const}
        leftEye={{ sph: prescription.leftEye.sph, cyl: prescription.leftEye.cyl, axis: prescription.leftEye.axis, va: prescription.leftEye.va, remarks: prescription.leftEye.remarks || "" } as const}
        distancePD={prescription.pd}
        nearPD={prescription.nearPD || ""}
        nearVisionRight={prescription.nearVisionRight || { add: "", va: "", remarks: "" } as const}
        nearVisionLeft={prescription.nearVisionLeft || { add: "", va: "", remarks: "" } as const}
        findings={`${prescription.findings}${prescription.diagnosis ? `\n\nDiagnosis: ${prescription.diagnosis}` : ""}`}
        glasses={prescription.medications}
        eyeDrops={prescription.eyeDrops}
        exercises={prescription.exercises}
        reviewAfter={prescription.reviewAfter || (prescription.followUpDate ? new Date(prescription.followUpDate).toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", year: "numeric" }) : "")}
      />
    </div>
  );
}
