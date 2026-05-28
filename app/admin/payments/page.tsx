"use client";

import { useEffect, useState, useMemo } from "react";
import { paymentsService, usersService, servicesService } from "@/services/firestore";
import type { PaymentDocument, UserDocument, ServiceDocument } from "@/types/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PremiumButton } from "@/components/premium";
import { Input } from "@/components/ui/input";
import {
  CreditCard, RefreshCcw, Search, TrendingUp,
  AlertCircle, CheckCircle2, XCircle, Clock,
  RotateCcw, IndianRupee, ArrowUpRight, User, Stethoscope,
  CalendarDays, Receipt, ChevronDown, ChevronUp,
} from "lucide-react";
import { TYPOGRAPHY } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

type EnrichedPayment = PaymentDocument & {
  patient?: UserDocument | null;
  doctor?: UserDocument | null;
  service?: ServiceDocument | null;
};

function fmtDateTime(d?: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}
function fmtDate(d?: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

type StatusFilter = "all" | "completed" | "refunded" | "pending" | "failed";
type RefundFilter = "all" | "processed" | "pending" | "failed" | "none";

const paymentStatusCfg: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:    { label: "Pending",    color: "bg-amber-100 text-amber-800 border-amber-200",  icon: <Clock className="h-3 w-3" /> },
  processing: { label: "Processing", color: "bg-blue-100 text-blue-800 border-blue-200",     icon: <RotateCcw className="h-3 w-3" /> },
  completed:  { label: "Completed",  color: "bg-green-100 text-green-800 border-green-200",  icon: <CheckCircle2 className="h-3 w-3" /> },
  refunded:   { label: "Refunded",   color: "bg-purple-100 text-purple-800 border-purple-200", icon: <ArrowUpRight className="h-3 w-3" /> },
  failed:     { label: "Failed",     color: "bg-red-100 text-red-800 border-red-200",         icon: <XCircle className="h-3 w-3" /> },
  cancelled:  { label: "Cancelled",  color: "bg-gray-100 text-gray-700 border-gray-200",      icon: <XCircle className="h-3 w-3" /> },
};

const refundStatusCfg: Record<string, { label: string; color: string }> = {
  none:      { label: "No Refund",          color: "bg-gray-100 text-gray-600 border-gray-200" },
  pending:   { label: "Refund Pending",     color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  processed: { label: "Refund Processed",   color: "bg-green-100 text-green-700 border-green-200" },
  failed:    { label: "Refund Failed",      color: "bg-red-100 text-red-700 border-red-200" },
};

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: "all",       label: "All" },
  { key: "completed", label: "Completed" },
  { key: "refunded",  label: "Refunded" },
  { key: "pending",   label: "Pending" },
  { key: "failed",    label: "Failed" },
];

const REFUND_TABS: { key: RefundFilter; label: string }[] = [
  { key: "all",       label: "All Refunds" },
  { key: "pending",   label: "Pending" },
  { key: "processed", label: "Processed" },
  { key: "failed",    label: "Failed" },
];

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<EnrichedPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [refundFilter, setRefundFilter] = useState<RefundFilter>("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"payments" | "refunds">("payments");

  const load = async () => {
    setLoading(true);
    try {
      const all = await paymentsService.getAll();
      const enriched = await Promise.all(
        all.map(async (p) => {
          const [patient, doctor, service] = await Promise.all([
            usersService.getById(p.userId).catch(() => null),
            p.doctorId ? usersService.getById(p.doctorId).catch(() => null) : null,
            p.serviceId ? servicesService.getById(p.serviceId).catch(() => null) : null,
          ]);
          return { ...p, patient, doctor, service };
        })
      );
      setPayments(enriched);
    } catch (e) {
      console.error("Error loading payments:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Stats
  const stats = useMemo(() => {
    const completed   = payments.filter((p) => p.status === "completed");
    const refunded    = payments.filter((p) => p.status === "refunded");
    const failed      = payments.filter((p) => p.status === "failed");
    const refundPending = payments.filter((p) => p.refundStatus === "pending");
    const refundFailed  = payments.filter((p) => p.refundStatus === "failed");
    const totalRevenue  = completed.reduce((s, p) => s + p.amount, 0);
    const totalRefunded = refunded.reduce((s, p) => s + p.amount, 0);
    return { completed: completed.length, refunded: refunded.length, failed: failed.length, refundPending: refundPending.length, refundFailed: refundFailed.length, totalRevenue, totalRefunded };
  }, [payments]);

  // Filtered list
  const filtered = useMemo(() => {
    let list = payments;
    if (view === "refunds") {
      list = list.filter((p) => p.refundStatus && p.refundStatus !== "none");
      if (refundFilter !== "all") list = list.filter((p) => p.refundStatus === refundFilter);
    } else {
      if (statusFilter !== "all") list = list.filter((p) => p.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) =>
        p.patient?.displayName?.toLowerCase().includes(q) ||
        p.patient?.email?.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.razorpayPaymentId?.toLowerCase().includes(q) ||
        p.razorpayOrderId?.toLowerCase().includes(q) ||
        p.refundId?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [payments, view, statusFilter, refundFilter, search]);

  return (
    <div className="space-y-5 min-w-0">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className={TYPOGRAPHY.heading}>Payments & Refunds</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Track all transactions and refund statuses.</p>
        </div>
        <PremiumButton variant="outline" onClick={load} disabled={loading} className="shrink-0">
          <RefreshCcw className={cn("h-4 w-4 mr-1.5", loading && "animate-spin")} />
          Refresh
        </PremiumButton>
      </div>

      {/* Stats — 2 cols on 320px, 3 on sm, 5 on lg */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {[
          {
            icon: <IndianRupee className="h-4 w-4 text-secondary" />,
            label: "Revenue",
            value: `₹${stats.totalRevenue.toLocaleString("en-IN")}`,
            sub: `${stats.completed} completed`,
            accent: "text-primary",
          },
          {
            icon: <ArrowUpRight className="h-4 w-4 text-purple-500" />,
            label: "Refunded",
            value: `₹${stats.totalRefunded.toLocaleString("en-IN")}`,
            sub: `${stats.refunded} transactions`,
            accent: "text-purple-700",
          },
          {
            icon: <RotateCcw className="h-4 w-4 text-amber-500" />,
            label: "Refund Pending",
            value: String(stats.refundPending),
            sub: "needs processing",
            accent: stats.refundPending > 0 ? "text-amber-700" : "text-primary",
          },
          {
            icon: <AlertCircle className="h-4 w-4 text-red-500" />,
            label: "Refund Failed",
            value: String(stats.refundFailed),
            sub: "requires attention",
            accent: stats.refundFailed > 0 ? "text-red-600" : "text-primary",
            urgent: stats.refundFailed > 0,
          },
          {
            icon: <TrendingUp className="h-4 w-4 text-primary" />,
            label: "Net Revenue",
            value: `₹${(stats.totalRevenue - stats.totalRefunded).toLocaleString("en-IN")}`,
            sub: "after refunds",
            accent: "text-primary",
          },
        ].map((s) => (
          <Card
            key={s.label}
            className={cn(
              "border transition-all",
              s.urgent ? "border-red-200 bg-red-50/40" : "border-primary/10 bg-white/70"
            )}
          >
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-1.5 mb-2">
                {s.icon}
                <span className="text-[11px] sm:text-xs text-muted-foreground font-medium leading-tight">{s.label}</span>
              </div>
              <p className={cn("text-lg sm:text-xl font-bold leading-none", s.accent)}>{s.value}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Controls: view toggle + search stacked on mobile */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex gap-1 p-0.5 bg-primary/5 rounded-xl border border-primary/10">
            <button
              onClick={() => setView("payments")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs sm:text-sm font-medium transition",
                view === "payments" ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-primary"
              )}
            >
              <CreditCard className="h-3.5 w-3.5" />
              Payments
            </button>
            <button
              onClick={() => setView("refunds")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs sm:text-sm font-medium transition",
                view === "refunds" ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-primary"
              )}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Refunds
              {stats.refundFailed > 0 && (
                <span className="bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {stats.refundFailed}
                </span>
              )}
            </button>
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search name, ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex gap-1.5 flex-wrap">
          {(view === "payments" ? STATUS_TABS : REFUND_TABS).map((tab) => {
            const isActive = view === "payments" ? statusFilter === tab.key : refundFilter === tab.key;
            const count = view === "payments"
              ? (tab.key === "all" ? payments.length : payments.filter((p) => p.status === tab.key).length)
              : (tab.key === "all"
                  ? payments.filter((p) => p.refundStatus && p.refundStatus !== "none").length
                  : payments.filter((p) => p.refundStatus === tab.key).length);
            return (
              <button
                key={tab.key}
                onClick={() => view === "payments" ? setStatusFilter(tab.key as StatusFilter) : setRefundFilter(tab.key as RefundFilter)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium transition border",
                  isActive
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-muted-foreground border-primary/15 hover:border-primary/40"
                )}
              >
                {tab.label}
                {count > 0 && (
                  <span className={cn(
                    "ml-1 text-[10px] px-1.5 py-px rounded-full",
                    isActive ? "bg-white/20" : "bg-primary/8 text-primary"
                  )}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-secondary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-primary/10 bg-primary/5">
          <CardContent className="p-10 text-center">
            <CreditCard className="h-10 w-10 text-primary/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No payments found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((payment) => (
            <PaymentCard key={payment.id} payment={payment} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DetailRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 min-w-0">
      <span className="text-[10px] text-muted-foreground/70 shrink-0 w-[76px] pt-px leading-tight">{label}</span>
      <span className={cn("text-[11px] text-primary/80 break-all min-w-0 leading-tight", mono && "font-mono")}>{value}</span>
    </div>
  );
}

function SectionCard({ icon, title, children, accent }: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className={cn("rounded-xl border px-3 py-2.5 space-y-1.5", accent ?? "bg-primary/5 border-primary/10")}>
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{title}</span>
      </div>
      {children}
    </div>
  );
}

function PaymentCard({ payment }: { payment: EnrichedPayment }) {
  const [expanded, setExpanded] = useState(false);
  const pCfg = paymentStatusCfg[payment.status] ?? paymentStatusCfg.pending;
  const rCfg = refundStatusCfg[payment.refundStatus ?? "none"] ?? refundStatusCfg.none;
  const showFailure = payment.refundStatus === "failed" && payment.refundFailureReason;

  return (
    <Card
      className={cn(
        "border overflow-hidden transition-all",
        payment.refundStatus === "failed" ? "border-red-200" :
        (payment.refundStatus === "pending" && payment.status !== "pending") ? "border-amber-200" :
        "border-primary/10"
      )}
    >
      <CardContent className="p-0">
        {payment.refundStatus === "failed" && (
          <div className="h-0.5 bg-gradient-to-r from-red-400 to-red-300" />
        )}

        {/* Always-visible header — tap to expand */}
        <button
          className="w-full text-left p-3 sm:p-4 hover:bg-primary/[0.02] transition-colors"
          onClick={() => setExpanded((e) => !e)}
        >
          <div className="flex items-start justify-between gap-3 min-w-0">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <p className="font-semibold text-primary text-sm leading-tight truncate">
                  {payment.patient?.displayName || "Unknown Patient"}
                </p>
                {payment.doctor && (
                  <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                    · Dr. {payment.doctor.displayName}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{payment.patient?.email || "—"}</p>
              {payment.service && (
                <p className="text-xs text-secondary/80 truncate">{payment.service.title}</p>
              )}
              <p className="text-[10px] text-muted-foreground/60">{fmtDateTime(payment.createdAt)}</p>
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <Badge className={cn("text-[11px] flex items-center gap-1 px-2 py-0.5", pCfg.color)}>
                  {pCfg.icon}{pCfg.label}
                </Badge>
                <Badge className={cn("text-[11px] px-2 py-0.5", rCfg.color)}>{rCfg.label}</Badge>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
              <div className="text-right">
                <p className="text-base font-bold text-secondary">₹{payment.amount}</p>
                <p className="text-[10px] text-muted-foreground">{payment.currency}</p>
              </div>
              <span className="text-muted-foreground">
                {expanded
                  ? <ChevronUp className="h-4 w-4" />
                  : <ChevronDown className="h-4 w-4" />}
              </span>
            </div>
          </div>
        </button>

        {/* Expanded detail sections */}
        {expanded && (
          <div className="px-3 sm:px-4 pb-4 space-y-2.5 border-t border-primary/5 pt-3">

            <SectionCard icon={<User className="h-3.5 w-3.5" />} title="Patient">
              <DetailRow label="Name"   value={payment.patient?.displayName} />
              <DetailRow label="Email"  value={payment.patient?.email} />
              <DetailRow label="Phone"  value={payment.patient?.phoneNumber} />
              <DetailRow label="UID"    value={payment.userId} mono />
            </SectionCard>

            {payment.doctor && (
              <SectionCard icon={<Stethoscope className="h-3.5 w-3.5" />} title="Doctor">
                <DetailRow label="Name"   value={payment.doctor.displayName} />
                <DetailRow label="Email"  value={payment.doctor.email} />
                <DetailRow label="Phone"  value={payment.doctor.phoneNumber} />
                <DetailRow label="UID"    value={payment.doctorId} mono />
              </SectionCard>
            )}

            {payment.service && (
              <SectionCard icon={<Receipt className="h-3.5 w-3.5" />} title="Service">
                <DetailRow label="Title"    value={payment.service.title} />
                <DetailRow label="Type"     value={payment.service.type?.replace(/_/g, " ")} />
                <DetailRow label="Duration" value={`${payment.service.duration} min`} />
                <DetailRow label="Price"    value={`₹${payment.service.price}`} />
              </SectionCard>
            )}

            <SectionCard icon={<CalendarDays className="h-3.5 w-3.5" />} title="Timeline">
              <DetailRow label="Payment created"  value={fmtDateTime(payment.createdAt)} />
              <DetailRow label="Payment received" value={fmtDateTime(payment.completedAt)} />
              <DetailRow label="Requested time"   value={fmtDateTime(payment.requestedTime)} />
              <DetailRow label="Refunded at"      value={fmtDateTime(payment.refundedAt)} />
              <DetailRow label="Refund reason"    value={payment.refundReason} />
              <DetailRow label="Last updated"     value={fmtDateTime(payment.updatedAt)} />
              <DetailRow label="Method"           value={payment.method?.replace(/_/g, " ").toUpperCase()} />
            </SectionCard>

            <SectionCard icon={<CreditCard className="h-3.5 w-3.5" />} title="Transaction IDs">
              <DetailRow label="Order ID"    value={payment.razorpayOrderId}  mono />
              <DetailRow label="Payment ID"  value={payment.razorpayPaymentId} mono />
              <DetailRow label="Refund ID"   value={payment.refundId} mono />
              <DetailRow label="Booking ID"  value={payment.bookingRequestId} mono />
            </SectionCard>

            {showFailure && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-3 py-2.5 flex items-start gap-2">
                <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-red-700">Refund failed</p>
                  <p className="text-[11px] text-red-600 mt-0.5 break-words">{payment.refundFailureReason}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
