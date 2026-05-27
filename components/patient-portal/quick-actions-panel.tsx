"use client";

import Link from "next/link";
import { Calendar, ClipboardList, FileText, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassPanel } from "./glass-panel";
import { PremiumButton } from "./premium-button";
import { SectionHeader } from "./section-header";

interface QuickAction {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const defaultActions: QuickAction[] = [
  {
    label: "Book Consultation",
    href: "/patient/appointments",
    icon: <Calendar className="h-4 w-4" />,
  },
  {
    label: "View Appointments",
    href: "/patient/appointments",
    icon: <ClipboardList className="h-4 w-4" />,
  },
  {
    label: "View Prescriptions",
    href: "/patient/prescriptions",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    label: "View Profile",
    href: "/patient/profile",
    icon: <User className="h-4 w-4" />,
  },
];

export interface QuickActionsPanelProps {
  /** Additional CSS classes */
  className?: string;
}

export function QuickActionsPanel({ className }: QuickActionsPanelProps) {
  return (
    <GlassPanel padding="md" className={cn(className)}>
      <SectionHeader title="Quick Actions" className="mt-0 mb-4" />
      <div className="space-y-3">
        {defaultActions.map((action) => (
          <Link key={action.label} href={action.href} className="block">
            <PremiumButton
              variant="outline"
              size="md"
              fullWidth
              icon={action.icon}
              className="justify-start"
            >
              {action.label}
            </PremiumButton>
          </Link>
        ))}
      </div>
    </GlassPanel>
  );
}
