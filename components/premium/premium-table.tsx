"use client";

import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SPACING, TYPOGRAPHY } from "@/lib/design-tokens";
import { tableRowEntrance } from "@/lib/motion-variants";
import { GlassPanel } from "./glass-panel";
import { PremiumButton } from "./premium-button";

export interface PremiumTableColumn<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T, index: number) => React.ReactNode;
  width?: string;
}

export interface PremiumTableProps<T> {
  columns: PremiumTableColumn<T>[];
  data: T[];
  onRowClick?: (row: T, index: number) => void;
  selectedRow?: number | null;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  emptyMessage?: string;
  className?: string;
}

function getCellValue<T>(row: T, key: keyof T | string): React.ReactNode {
  const value = (row as Record<string, unknown>)[key as string];
  if (value === null || value === undefined) return "";
  return String(value);
}

export function PremiumTable<T>({
  columns,
  data,
  onRowClick,
  selectedRow,
  pagination,
  emptyMessage = "No data available",
  className,
}: PremiumTableProps<T>) {
  const shouldReduceMotion = useReducedMotion();

  // Empty state
  if (data.length === 0) {
    return (
      <GlassPanel rounded="3xl" padding="md" className={cn(className)}>
        <div className="flex items-center justify-center py-12">
          <p className={cn(TYPOGRAPHY.body, "text-muted-foreground")}>
            {emptyMessage}
          </p>
        </div>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel rounded="3xl" padding="md" className={cn(className)}>
      {/* Desktop table view */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={cn(
                    TYPOGRAPHY.label,
                    "text-left pb-4 px-4"
                  )}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="wait">
              {data.map((row, index) => (
                <motion.tr
                  key={index}
                  custom={index}
                  variants={shouldReduceMotion ? undefined : tableRowEntrance}
                  initial="hidden"
                  animate="visible"
                  className={cn(
                    "border-b border-border transition-colors duration-150 ease-in-out",
                    onRowClick && "cursor-pointer",
                    selectedRow === index &&
                      "border-l-[3px] border-l-primary",
                    "hover:bg-primary/[0.08]"
                  )}
                  onClick={() => onRowClick?.(row, index)}
                >
                  {columns.map((col) => (
                    <td
                      key={String(col.key)}
                      className="px-4 py-4"
                      style={col.width ? { width: col.width } : undefined}
                    >
                      {col.render
                        ? col.render(row, index)
                        : getCellValue(row, col.key)}
                    </td>
                  ))}
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Mobile card-based list view */}
      <div className="block md:hidden space-y-3">
        <AnimatePresence mode="wait">
          {data.map((row, index) => (
            <motion.div
              key={index}
              custom={index}
              variants={shouldReduceMotion ? undefined : tableRowEntrance}
              initial="hidden"
              animate="visible"
              className={cn(
                "rounded-2xl border border-border p-4 transition-colors duration-150 ease-in-out",
                onRowClick && "cursor-pointer",
                selectedRow === index &&
                  "border-l-[3px] border-l-primary",
                "hover:bg-primary/[0.08]"
              )}
              onClick={() => onRowClick?.(row, index)}
            >
              {columns.map((col) => (
                <div key={String(col.key)} className="flex justify-between py-1">
                  <span className={cn(TYPOGRAPHY.label)}>{col.header}</span>
                  <span className="text-sm text-foreground">
                    {col.render
                      ? col.render(row, index)
                      : getCellValue(row, col.key)}
                  </span>
                </div>
              ))}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4 mt-4 border-t border-border">
          <PremiumButton
            variant="outline"
            size="sm"
            className="rounded-2xl"
            disabled={pagination.currentPage <= 1}
            onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
            icon={<ChevronLeft className="h-4 w-4" />}
          >
            Previous
          </PremiumButton>

          <span className={cn(TYPOGRAPHY.label, "normal-case tracking-normal")}>
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>

          <PremiumButton
            variant="outline"
            size="sm"
            className="rounded-2xl"
            disabled={pagination.currentPage >= pagination.totalPages}
            onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
            trailingIcon={<ChevronRight className="h-4 w-4" />}
          >
            Next
          </PremiumButton>
        </div>
      )}
    </GlassPanel>
  );
}
