"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { getFirebaseAuth } from "@/services/firebase/client";
import { servicesService, usersService, doctorAvailabilityService } from "@/services/firestore";
import { EA, eaError } from "@/lib/errors";
import type { ServiceDocument, UserDocument, DoctorAvailabilityDocument } from "@/types/firestore";
import type { BookingState, BookingStep } from "@/types/booking";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, Clock, Check, User, Star, ChevronLeft, ChevronRight, ShieldCheck, Loader2, Stethoscope, Eye, Video, Glasses, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && typeof window.Razorpay !== "undefined") {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const STEPS: BookingStep[] = [
  { id: "service", title: "Choose Service", description: "Select your consultation type", completed: false },
  { id: "doctor", title: "Choose Doctor", description: "Select your preferred doctor", completed: false },
  { id: "time", title: "Choose Time", description: "Pick a convenient time", completed: false },
  { id: "notes", title: "Add Notes", description: "Share any concerns", completed: false },
  { id: "confirm", title: "Submit Request", description: "Review and submit", completed: false },
];

export default function BookingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<BookingState>({
    currentStep: 0,
    service: null,
    doctor: null,
    slot: null,
    notes: "",
    loading: false,
    error: null,
  });
  const [services, setServices] = useState<ServiceDocument[]>([]);
  const [servicesWithDoctors, setServicesWithDoctors] = useState<(ServiceDocument & { doctors: UserDocument[] })[]>([]);
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);
  const [doctorAvailability, setDoctorAvailability] = useState<DoctorAvailabilityDocument[]>([]);

  useEffect(() => {
    loadServicesWithDoctors();
  }, []);

  // Redirect if not authenticated — must be in useEffect, not during render
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
    }
  }, [authLoading, user, router]);

  const loadServicesWithDoctors = async () => {
    try {
      const allServices = await servicesService.getAll();
      const servicesWithDoctorsData = await Promise.all(
        allServices.map(async (service) => {
          const doctorIds = service.doctorIds || [];
          const doctors = await Promise.all(
            doctorIds.map((doctorId) => usersService.getById(doctorId))
          );
          return { ...service, doctors: doctors.filter((d) => d !== null) as UserDocument[] };
        })
      );
      setServices(allServices);
      setServicesWithDoctors(servicesWithDoctorsData);
    } catch (error) {
      eaError(EA.BKG_001, error);
    }
  };

  const handleServiceSelect = (service: ServiceDocument) => {
    setState({ ...state, service, doctor: null });
    setState((prev) => ({ ...prev, currentStep: prev.currentStep + 1 }));
  };

  const handleDoctorSelect = async (doctor: UserDocument) => {
    setState({ ...state, doctor });
    
    // Load doctor's availability
    try {
      const availability = await doctorAvailabilityService.getByDoctorId(doctor.id);
      setDoctorAvailability(availability);
    } catch (error) {
      eaError(EA.BKG_001, error);
    }
    
    setState((prev) => ({ ...prev, currentStep: prev.currentStep + 1 }));
  };

  const handleTimeSelect = (time: Date) => {
    setSelectedTime(time);
    setState((prev) => ({ ...prev, currentStep: prev.currentStep + 1 }));
  };

  const handleNotesChange = (notes: string) => {
    setState({ ...state, notes });
  };

  const handleConfirm = async () => {
    if (!state.service || !state.doctor || !selectedTime || !user) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // 1. Get Firebase ID token for authenticated API calls
      const auth = getFirebaseAuth();
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("Authentication required. Please sign in again.");

      // 2. Create Razorpay order on the server
      const orderRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          doctorId: state.doctor.id,
          serviceId: state.service.id,
          requestedTime: selectedTime.toISOString(),
          notes: state.notes || null,
          amount: state.service.price,
          currency: state.service.currency || "INR",
        }),
      });

      if (!orderRes.ok) {
        const errData = await orderRes.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to initiate payment. Please try again.");
      }

      const orderData = await orderRes.json();

      // 3. Load Razorpay checkout script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Payment gateway failed to load. Please check your connection and try again.");
      }

      // 4. Open Razorpay checkout — waits for user to complete or dismiss
      await new Promise<void>((resolve, reject) => {
        const options: RazorpayOptions = {
          key: orderData.keyId,
          amount: orderData.amount, // Already in paise from Razorpay order
          currency: orderData.currency,
          name: "Eye Aura",
          description: state.service?.title,
          order_id: orderData.orderId,
          handler: async (response) => {
            try {
              // 5. Verify payment signature server-side — creates booking_request
              const verifyRes = await fetch("/api/payments/verify-payment", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                  paymentId: orderData.paymentId,
                }),
              });

              if (!verifyRes.ok) {
                const errData = await verifyRes.json().catch(() => ({}));
                reject(new Error(errData.error || "Payment verification failed. Please contact support."));
                return;
              }

              const verifyData = await verifyRes.json();
              resolve();
              router.push(`/patient/requests/${verifyData.bookingRequestId}`);
            } catch (err: any) {
              reject(err);
            }
          },
          prefill: {
            name: user?.displayName || "",
            email: user?.email || "",
          },
          notes: {
            booking_notes: state.notes || "",
          },
          modal: {
            ondismiss: () => {
              setState((prev) => ({ ...prev, loading: false }));
              resolve(); // Dismissed — not an error, just cancelled
            },
          },
          theme: {
            color: "#0F4F4B",
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", (resp: any) => {
          reject(new Error(resp.error?.description || "Payment failed. Please try again."));
        });
        rzp.open();
      });
    } catch (error: any) {
      setState((prev) => ({ ...prev, loading: false, error: error.message }));
    }
  };

  const handleBack = () => {
    setState((prev) => ({ ...prev, currentStep: Math.max(0, prev.currentStep - 1) }));
  };

  const currentStep = STEPS[state.currentStep];

  return (
    <div className="min-h-screen bg-[#F5F2ED]">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-[#0f4f4b]/8 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <div className="py-4 flex items-center gap-6">
            <div className="min-w-0">
              <h1 className="font-display text-xl text-[#0f4f4b] leading-none">Book Consultation</h1>
              <p className="text-xs text-[#0f4f4b]/45 mt-0.5">
                {STEPS[state.currentStep]?.title} · Step {state.currentStep + 1} of {STEPS.length}
              </p>
            </div>
            {/* Premium stepper */}
            <div className="flex-1 flex items-center gap-0">
              {STEPS.map((step, index) => (
                <div key={step.id} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <div className={cn(
                      "h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-300",
                      index < state.currentStep  && "bg-[#0f4f4b] text-white",
                      index === state.currentStep && "bg-[#0f4f4b] text-white shadow-lg shadow-[#0f4f4b]/25 scale-110",
                      index > state.currentStep  && "bg-[#0f4f4b]/8 text-[#0f4f4b]/35 border border-[#0f4f4b]/12"
                    )}>
                      {index < state.currentStep ? <Check className="h-3 w-3" /> : index + 1}
                    </div>
                    <span className={cn(
                      "text-[9px] font-semibold hidden md:block tracking-wide uppercase",
                      index <= state.currentStep ? "text-[#0f4f4b]/70" : "text-[#0f4f4b]/25"
                    )}>{step.title.split(" ").slice(-1)[0]}</span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={cn(
                      "flex-1 h-px mx-1.5 transition-all duration-500",
                      index < state.currentStep ? "bg-[#0f4f4b]" : "bg-[#0f4f4b]/12"
                    )} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-5 pb-20 pt-8 sm:px-8">
        {state.currentStep === 0 && (
          <ServiceSelectionStep
            servicesWithDoctors={servicesWithDoctors}
            onSelect={handleServiceSelect}
            selected={state.service}
          />
        )}

        {state.currentStep === 1 && (
          <DoctorSelectionStep
            service={state.service}
            servicesWithDoctors={servicesWithDoctors}
            onSelect={handleDoctorSelect}
            selected={state.doctor}
            onBack={handleBack}
          />
        )}

        {state.currentStep === 2 && (
          <TimeSelectionStep
            doctorAvailability={doctorAvailability}
            onSelect={handleTimeSelect}
            selected={selectedTime}
            onBack={handleBack}
          />
        )}

        {state.currentStep === 3 && (
          <NotesStep
            notes={state.notes}
            onChange={handleNotesChange}
            onNext={() => setState((prev) => ({ ...prev, currentStep: prev.currentStep + 1 }))}
            onBack={handleBack}
          />
        )}

        {state.currentStep === 4 && (
          <ConfirmationStep
            service={state.service}
            doctor={state.doctor}
            selectedTime={selectedTime}
            notes={state.notes}
            onConfirm={handleConfirm}
            onBack={handleBack}
            loading={state.loading}
            error={state.error}
          />
        )}
      </div>
    </div>
  );
}

function serviceIcon(type: string) {
  if (type.includes("acuity") || type.includes("vision")) return Eye;
  if (type.includes("video") || type.includes("voice")) return Video;
  if (type.includes("contact") || type.includes("lens")) return Glasses;
  return Stethoscope;
}

function ServiceSelectionStep({
  servicesWithDoctors,
  onSelect,
  selected,
}: {
  servicesWithDoctors: (ServiceDocument & { doctors: UserDocument[] })[];
  onSelect: (service: ServiceDocument) => void;
  selected: ServiceDocument | null;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-[#0f4f4b]">Choose Your Service</h2>
        <p className="mt-1.5 text-sm text-[#0f4f4b]/55">Select the consultation type that fits your needs</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {servicesWithDoctors.map((service) => {
          const Icon = serviceIcon(service.type);
          const active = selected?.id === service.id;
          return (
            <div
              key={service.id}
              onClick={() => onSelect(service)}
              className={cn(
                "group relative cursor-pointer rounded-2xl border bg-white p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0",
                active
                  ? "border-[#0f4f4b] shadow-sm shadow-[#0f4f4b]/10 ring-1 ring-[#0f4f4b]/20"
                  : "border-[#0f4f4b]/12 hover:border-[#0f4f4b]/30"
              )}
            >
              {active && (
                <div className="absolute top-4 right-4 h-5 w-5 rounded-full bg-[#0f4f4b] flex items-center justify-center">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
              <div className="h-10 w-10 rounded-xl bg-[#0f4f4b]/8 flex items-center justify-center mb-4">
                <Icon className="h-5 w-5 text-[#0f4f4b]" />
              </div>
              <h3 className="font-bold text-[#0f4f4b] text-base leading-tight mb-1.5">{service.title}</h3>
              <p className="text-xs text-[#0f4f4b]/50 leading-relaxed line-clamp-2 mb-4">{service.description}</p>
              <div className="flex items-center justify-between pt-3 border-t border-[#0f4f4b]/8">
                <span className="font-display text-lg font-bold text-[#b5964d]">
                  {service.currency} {service.price}
                </span>
                <span className="text-xs font-semibold text-[#0f4f4b]/50 bg-[#0f4f4b]/6 px-2.5 py-1 rounded-full">
                  {service.duration} min
                </span>
              </div>
              {service.doctors.length > 0 && (
                <p className="text-[11px] text-[#0f4f4b]/40 mt-2">
                  {service.doctors.length} doctor{service.doctors.length > 1 ? "s" : ""} available
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DoctorSelectionStep({
  service,
  servicesWithDoctors,
  onSelect,
  selected,
  onBack,
}: {
  service: ServiceDocument | null;
  servicesWithDoctors: (ServiceDocument & { doctors: UserDocument[] })[];
  onSelect: (doctor: UserDocument) => void;
  selected: UserDocument | null;
  onBack: () => void;
}) {
  const serviceWithDoctors = servicesWithDoctors.find((s) => s.id === service?.id);
  const doctors = serviceWithDoctors?.doctors || [];

  const getInitial = (d: UserDocument) => {
    const name = d.displayName || d.email || "D";
    return name[0].toUpperCase();
  };
  const getName = (d: UserDocument) => {
    if (!d.displayName || d.displayName === d.email) return d.email;
    return d.displayName;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-2xl text-[#0f4f4b]">Choose Your Doctor</h2>
          <p className="mt-1.5 text-sm text-[#0f4f4b]/55 truncate">
            Select a specialist for <span className="font-semibold">{service?.title}</span>
          </p>
        </div>
        <button
          onClick={onBack}
          className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-[#0f4f4b]/60 hover:text-[#0f4f4b] border border-[#0f4f4b]/20 rounded-xl px-3 py-2 hover:border-[#0f4f4b]/40 transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Back
        </button>
      </div>

      {doctors.length === 0 ? (
        <div className="rounded-2xl border border-[#0f4f4b]/10 bg-white p-10 text-center">
          <div className="h-14 w-14 rounded-2xl bg-[#0f4f4b]/6 flex items-center justify-center mx-auto mb-4">
            <User className="h-7 w-7 text-[#0f4f4b]/30" />
          </div>
          <p className="text-sm font-semibold text-[#0f4f4b]/60 mb-1">No doctors available yet</p>
          <p className="text-xs text-[#0f4f4b]/40">Please try a different service or contact support</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {doctors.map((doctor) => {
            const active = selected?.id === doctor.id;
            return (
              <div
                key={doctor.id}
                onClick={() => onSelect(doctor)}
                className={cn(
                  "group relative cursor-pointer rounded-2xl border bg-white p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
                  active
                    ? "border-[#0f4f4b] shadow-sm ring-1 ring-[#0f4f4b]/20"
                    : "border-[#0f4f4b]/12 hover:border-[#0f4f4b]/30"
                )}
              >
                <div className="flex items-center gap-3.5">
                  {/* Avatar */}
                  <div className={cn(
                    "h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0 transition-colors",
                    active ? "bg-[#0f4f4b] text-white" : "bg-[#b5964d]/15 text-[#b5964d]"
                  )}>
                    {getInitial(doctor)}
                  </div>

                  {/* Info — min-w-0 + truncate fixes long name overflow */}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-bold truncate leading-tight",
                      active ? "text-[#0f4f4b]" : "text-[#0f4f4b]"
                    )}>
                      {getName(doctor)}
                    </p>
                    <p className="text-xs text-[#0f4f4b]/45 truncate mt-0.5">{doctor.email}</p>
                    <div className="flex items-center gap-1 mt-1.5">
                      <Star className="h-3 w-3 fill-[#b5964d] text-[#b5964d] shrink-0" />
                      <span className="text-xs font-bold text-[#0f4f4b]/80">4.9</span>
                      <span className="text-[11px] text-[#0f4f4b]/35">(120 reviews)</span>
                    </div>
                  </div>

                  {/* Selected check */}
                  {active && (
                    <div className="h-6 w-6 rounded-full bg-[#0f4f4b] flex items-center justify-center shrink-0">
                      <Check className="h-3.5 w-3.5 text-white" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TimeSelectionStep({
  doctorAvailability,
  onSelect,
  selected,
  onBack,
}: {
  doctorAvailability: DoctorAvailabilityDocument[];
  onSelect: (time: Date) => void;
  selected: Date | null;
  onBack: () => void;
}) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(selected ? new Date(selected.toDateString()) : null);
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const dayMap: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  };

  const slotsByDate = useMemo(() => {
    const result: Record<string, Date[]> = {};
    const today = new Date();
    const twoMonthsLater = new Date();
    twoMonthsLater.setDate(twoMonthsLater.getDate() + 60);

    let current = new Date(today);
    current.setHours(0, 0, 0, 0);

    while (current <= twoMonthsLater) {
      const dayOfWeek = current.getDay();
      const dayName = Object.keys(dayMap).find((k) => dayMap[k] === dayOfWeek);
      const avail = doctorAvailability.find((a) => a.dayOfWeek === dayName && !a.isOff);

      if (avail) {
        const dateKey = current.toISOString().split("T")[0];
        const daySlots: Date[] = [];

        avail.timeRanges.forEach((range) => {
          const [sh, sm] = range.startTime.split(":").map(Number);
          const [eh, em] = range.endTime.split(":").map(Number);

          const endTime = new Date(current);
          endTime.setHours(eh, em, 0, 0);

          let slotStart = new Date(current);
          slotStart.setHours(sh, sm, 0, 0);

          while (slotStart.getTime() + avail.duration * 60000 <= endTime.getTime()) {
            if (slotStart > new Date()) {
              daySlots.push(new Date(slotStart));
            }
            slotStart = new Date(slotStart.getTime() + avail.duration * 60000);
          }
        });

        if (daySlots.length > 0) result[dateKey] = daySlots;
      }

      current = new Date(current);
      current.setDate(current.getDate() + 1);
    }

    return result;
  }, [doctorAvailability]);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
    return days;
  }, [currentMonth]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isAvailable = (date: Date) => !!slotsByDate[date.toISOString().split("T")[0]];
  const isPast = (date: Date) => { const d = new Date(date); d.setHours(0,0,0,0); return d < today; };
  const isToday = (date: Date) => date.toDateString() === new Date().toDateString();
  const isSelected = (date: Date) => selectedDate?.toDateString() === date.toDateString();

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const canGoPrev = currentMonth.getFullYear() > today.getFullYear() ||
    currentMonth.getMonth() > today.getMonth();

  const selectedDateKey = selectedDate?.toISOString().split("T")[0] ?? null;
  const selectedSlots = selectedDateKey ? slotsByDate[selectedDateKey] ?? [] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-2xl text-[#0f4f4b]">Choose Your Time</h2>
          <p className="mt-1.5 text-sm text-[#0f4f4b]/55">Select a date, then pick a time slot</p>
        </div>
        <button
          onClick={onBack}
          className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-[#0f4f4b]/60 hover:text-[#0f4f4b] border border-[#0f4f4b]/20 rounded-xl px-3 py-2 hover:border-[#0f4f4b]/40 transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Back
        </button>
      </div>

      {/* Calendar */}
      <div className="rounded-2xl border border-[#0f4f4b]/12 bg-white p-5">
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={prevMonth}
            disabled={!canGoPrev}
            className="h-8 w-8 rounded-xl border border-[#0f4f4b]/15 flex items-center justify-center text-[#0f4f4b]/50 hover:text-[#0f4f4b] hover:border-[#0f4f4b]/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-bold text-[#0f4f4b]">
            {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </span>
          <button
            onClick={nextMonth}
            className="h-8 w-8 rounded-xl border border-[#0f4f4b]/15 flex items-center justify-center text-[#0f4f4b]/50 hover:text-[#0f4f4b] hover:border-[#0f4f4b]/30 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 mb-2">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
            <div key={d} className="text-center text-[10px] font-bold text-[#0f4f4b]/35 py-1 tracking-wide">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((date, i) => {
            if (!date) return <div key={i} />;
            const past = isPast(date);
            const avail = isAvailable(date);
            const sel = isSelected(date);
            const tod = isToday(date);
            const disabled = past || !avail;
            return (
              <button
                key={i}
                disabled={disabled}
                onClick={() => setSelectedDate(date)}
                className={cn(
                  "rounded-xl py-2 text-xs font-semibold transition-all focus:outline-none",
                  sel && "bg-[#0f4f4b] text-white shadow-md shadow-[#0f4f4b]/20",
                  !sel && avail && !past && "bg-[#0f4f4b]/8 text-[#0f4f4b] hover:bg-[#0f4f4b]/15 cursor-pointer",
                  disabled && "text-[#0f4f4b]/20 cursor-not-allowed",
                  tod && !sel && "ring-2 ring-[#b5964d]/60 ring-offset-1",
                )}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-[#0f4f4b]/8">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm bg-[#0f4f4b]/15" />
            <span className="text-[11px] text-[#0f4f4b]/45">Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm bg-[#b5964d]/40 ring-1 ring-[#b5964d]/40" />
            <span className="text-[11px] text-[#0f4f4b]/45">Today</span>
          </div>
        </div>
      </div>

      {/* Time Slots */}
      {selectedDate && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-[#0f4f4b]/60 uppercase tracking-wider">
            {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          {selectedSlots.length === 0 ? (
            <div className="rounded-2xl border border-[#0f4f4b]/10 bg-white p-8 text-center">
              <p className="text-sm text-[#0f4f4b]/40">No time slots available for this day</p>
            </div>
          ) : (
            <div className="grid gap-2 grid-cols-3 sm:grid-cols-4">
              {selectedSlots.map((time, index) => {
                const isActive = selected?.getTime() === time.getTime();
                return (
                  <button
                    key={index}
                    onClick={() => onSelect(time)}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-xl border py-3 text-xs font-bold transition-all hover:-translate-y-0.5 hover:shadow-sm",
                      isActive
                        ? "bg-[#0f4f4b] border-[#0f4f4b] text-white shadow-md shadow-[#0f4f4b]/20"
                        : "bg-white border-[#0f4f4b]/15 text-[#0f4f4b] hover:border-[#0f4f4b]/40"
                    )}
                  >
                    <Clock className="h-3 w-3 shrink-0" />
                    {time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!selectedDate && (
        <div className="rounded-2xl border border-[#0f4f4b]/10 bg-white p-8 text-center">
          <Calendar className="h-8 w-8 text-[#0f4f4b]/25 mx-auto mb-3" />
          <p className="text-sm text-[#0f4f4b]/40">Select a highlighted date to see available slots</p>
        </div>
      )}
    </div>
  );
}

function NotesStep({
  notes,
  onChange,
  onNext,
  onBack,
}: {
  notes: string;
  onChange: (notes: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-2xl text-[#0f4f4b]">Add Notes</h2>
          <p className="mt-1.5 text-sm text-[#0f4f4b]/55">Share any concerns or context — optional but helpful</p>
        </div>
        <button
          onClick={onBack}
          className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-[#0f4f4b]/60 hover:text-[#0f4f4b] border border-[#0f4f4b]/20 rounded-xl px-3 py-2 hover:border-[#0f4f4b]/40 transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Back
        </button>
      </div>

      <div className="rounded-2xl border border-[#0f4f4b]/12 bg-white p-5">
        <textarea
          value={notes}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Describe your symptoms, concerns, or questions for the doctor..."
          className="w-full h-36 resize-none rounded-xl border border-[#0f4f4b]/15 bg-[#0f4f4b]/2 p-4 text-sm text-[#0f4f4b] placeholder:text-[#0f4f4b]/30 focus:outline-none focus:border-[#0f4f4b]/40 focus:ring-1 focus:ring-[#0f4f4b]/20 transition-all"
          maxLength={500}
        />
        <p className="mt-2 text-[11px] text-[#0f4f4b]/35 text-right">{notes.length}/500</p>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#0f4f4b]/60 hover:text-[#0f4f4b] transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Back
        </button>
        <button
          onClick={onNext}
          className="flex items-center gap-2 bg-[#0f4f4b] hover:bg-[#0a3a36] text-white text-sm font-bold px-6 py-3 rounded-2xl transition-colors shadow-sm shadow-[#0f4f4b]/20"
        >
          Continue <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ConfirmationStep({
  service,
  doctor,
  selectedTime,
  notes,
  onConfirm,
  onBack,
  loading,
  error,
}: {
  service: ServiceDocument | null;
  doctor: UserDocument | null;
  selectedTime: Date | null;
  notes: string;
  onConfirm: () => void;
  onBack: () => void;
  loading: boolean;
  error: string | null;
}) {
  const doctorName = doctor?.displayName && doctor.displayName !== doctor.email
    ? doctor.displayName
    : doctor?.email ?? "Doctor";

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-2xl text-[#0f4f4b]">Review & Pay</h2>
          <p className="mt-1.5 text-sm text-[#0f4f4b]/55">Confirm your details before proceeding to payment</p>
        </div>
        <button
          onClick={onBack}
          disabled={loading}
          className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-[#0f4f4b]/60 hover:text-[#0f4f4b] border border-[#0f4f4b]/20 rounded-xl px-3 py-2 hover:border-[#0f4f4b]/40 disabled:opacity-40 transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Back
        </button>
      </div>

      {/* Summary card */}
      <div className="rounded-2xl border border-[#0f4f4b]/12 bg-white overflow-hidden">
        {/* Header bar */}
        <div className="px-5 py-4 border-b border-[#0f4f4b]/8 flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-[#0f4f4b] flex items-center justify-center">
            <Check className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-bold text-[#0f4f4b]">Booking Summary</span>
        </div>

        <div className="p-5 space-y-3">
          {/* 4 summary rows */}
          {[
            { label: "Service",     value: service?.title,    sub: `${service?.duration} min session` },
            { label: "Doctor",      value: doctorName,        sub: doctor?.email },
            { label: "Date",        value: selectedTime?.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }), sub: undefined },
            { label: "Time",        value: selectedTime?.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }), sub: undefined },
          ].map(({ label, value, sub }) => (
            <div key={label} className="flex items-start justify-between gap-4 py-2.5 border-b border-[#0f4f4b]/6 last:border-0">
              <span className="text-xs font-semibold text-[#0f4f4b]/45 uppercase tracking-wider shrink-0 w-16">{label}</span>
              <div className="flex-1 min-w-0 text-right">
                <p className="text-sm font-bold text-[#0f4f4b] truncate">{value}</p>
                {sub && <p className="text-xs text-[#0f4f4b]/40 truncate mt-0.5">{sub}</p>}
              </div>
            </div>
          ))}

          {notes && (
            <div className="pt-1">
              <p className="text-xs font-semibold text-[#0f4f4b]/45 uppercase tracking-wider mb-1.5">Notes</p>
              <p className="text-sm text-[#0f4f4b]/70 leading-relaxed">{notes}</p>
            </div>
          )}
        </div>

        {/* Payment strip */}
        <div className="mx-5 mb-5 rounded-2xl bg-[#0f4f4b]/4 border border-[#0f4f4b]/10 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#0f4f4b]/50 font-semibold mb-0.5">Amount Due</p>
              <p className="font-display text-2xl font-bold text-[#b5964d]">
                {service?.currency} {service?.price}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#0f4f4b]/45">
              <ShieldCheck className="h-3.5 w-3.5 text-[#0f4f4b]/40 shrink-0" />
              <span>Secured by Razorpay</span>
            </div>
          </div>
        </div>
      </div>

      {/* Info notice */}
      <div className="flex gap-3 rounded-2xl bg-amber-50 border border-amber-200/80 px-4 py-3.5">
        <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 leading-relaxed">
          Your request is sent to the doctor after payment. They&apos;ll confirm or suggest a reschedule. No additional charge regardless of outcome.
        </p>
      </div>

      {error && (
        <div className="flex gap-2 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /> {error}
        </div>
      )}

      <button
        onClick={onConfirm}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2.5 bg-[#0f4f4b] hover:bg-[#0a3a36] disabled:opacity-60 text-white text-sm font-bold py-4 rounded-2xl transition-colors shadow-lg shadow-[#0f4f4b]/20"
      >
        {loading ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Processing payment…</>
        ) : (
          <><ShieldCheck className="h-4 w-4" /> Pay {service?.currency} {service?.price} &amp; Submit Request</>
        )}
      </button>
    </div>
  );
}
