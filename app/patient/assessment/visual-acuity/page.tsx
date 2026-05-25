import { AcuitySession } from "@/modules/visual-acuity/AcuitySession";

export const metadata = {
  title: "Visual Acuity Assessment — Eye Aura",
  description:
    "Calibration-based digital Snellen visual acuity test. Guided by your doctor in real-time.",
};

export default function VisualAcuityPage() {
  return <AcuitySession />;
}
