import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-secondary/25 bg-secondary/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-primary",
        className,
      )}
      {...props}
    />
  );
}
