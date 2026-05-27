import { type ReactNode } from "react";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InfoRowProps {
  /** Label text (rendered uppercase, small, muted) */
  label: string;
  /** Value content */
  value: ReactNode;
  /** Optional leading icon */
  icon?: LucideIcon;
  /** Additional CSS classes */
  className?: string;
}

export function InfoRow({ label, value, icon: Icon, className }: InfoRowProps) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      {Icon && (
        <Icon className="h-4 w-4 shrink-0 mt-0.5 text-secondary" />
      )}
      <div className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-[0.12em] font-medium text-muted-foreground">
          {label}
        </span>
        <span className="text-base font-semibold text-foreground">
          {value}
        </span>
      </div>
    </div>
  );
}
