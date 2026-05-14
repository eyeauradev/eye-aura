"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { bookingService } from "@/services/booking/booking.service";
import { servicesService, usersService } from "@/services/firestore";
import type { ServiceDocument, DoctorSlotDocument, UserDocument } from "@/types/firestore";
import type { BookingState, BookingStep } from "@/types/booking";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Calendar, Clock, Check, FileText, User } from "lucide-react";

const STEPS: BookingStep[] = [
  { id: "service", title: "Choose Service", description: "Select your consultation type", completed: false },
  { id: "slot", title: "Choose Slot", description: "Pick a convenient time", completed: false },
  { id: "notes", title: "Add Notes", description: "Share any concerns", completed: false },
  { id: "confirm", title: "Confirm", description: "Review and book", completed: false },
];

export default function BookingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<BookingState>({
    currentStep: 0,
    service: null,
    slot: null,
    notes: "",
    loading: false,
    error: null,
  });
  const [services, setServices] = useState<ServiceDocument[]>([]);
  const [servicesWithDoctors, setServicesWithDoctors] = useState<(ServiceDocument & { doctors: UserDocument[] })[]>([]);
  const [availableSlots, setAvailableSlots] = useState<DoctorSlotDocument[]>([]);

  useEffect(() => {
    loadServicesWithDoctors();
  }, []);

  const loadServicesWithDoctors = async () => {
    try {
      const allServices = await servicesService.getAll();
      const servicesWithDoctorsData = await Promise.all(
        allServices.map(async (service) => {
          const doctors = await Promise.all(
            service.doctorIds.map((doctorId) => usersService.getById(doctorId))
          );
          return { ...service, doctors: doctors.filter((d) => d !== null) as UserDocument[] };
        })
      );
      setServices(allServices);
      setServicesWithDoctors(servicesWithDoctorsData);
    } catch (error) {
      console.error("Failed to load services:", error);
    }
  };

  // Redirect if not authenticated
  if (!authLoading && !user) {
    router.push("/auth/login");
    return null;
  }

  const handleServiceSelect = (service: ServiceDocument) => {
    setState({ ...state, service });
    setState((prev) => ({ ...prev, currentStep: prev.currentStep + 1 }));
  };

  const handleSlotSelect = (slot: DoctorSlotDocument) => {
    setState({ ...state, slot });
    setState((prev) => ({ ...prev, currentStep: prev.currentStep + 1 }));
  };

  const handleNotesChange = (notes: string) => {
    setState({ ...state, notes });
  };

  const handleConfirm = async () => {
    if (!state.service || !state.slot || !user) return;

    setState({ ...state, loading: true, error: null });

    try {
      const appointment = await bookingService.initiateBooking(
        {
          serviceId: state.service.id,
          slotId: state.slot.id,
          notes: state.notes,
        },
        user.id,
        "default-doctor-id" // Would be dynamic in production
      );

      router.push(`/appointments/${appointment.id}`);
    } catch (error: any) {
      setState({ ...state, loading: false, error: error.message });
    }
  };

  const handleBack = () => {
    setState((prev) => ({ ...prev, currentStep: Math.max(0, prev.currentStep - 1) }));
  };

  const currentStep = STEPS[state.currentStep];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F4EF] via-[#DDE5DF] to-[#F7F4EF]">
      {/* Header */}
      <div className="border-b border-primary/10 bg-white/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
          <h1 className="font-display text-3xl text-primary sm:text-4xl">Book Consultation</h1>
          <p className="mt-2 text-base text-muted-foreground">
            A calm, guided booking experience
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <div className="flex items-center justify-between overflow-x-auto pb-4">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center min-w-fit">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition ${
                    index <= state.currentStep
                      ? "border-secondary bg-secondary text-white"
                      : "border-primary/20 bg-white text-muted-foreground"
                  }`}
                >
                  {index < state.currentStep ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-bold">{index + 1}</span>
                  )}
                </div>
                <div className="mt-2 text-center">
                  <p className="text-xs font-bold text-primary">{step.title}</p>
                  <p className="text-xs text-muted-foreground hidden sm:block">{step.description}</p>
                </div>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`mx-4 h-px w-16 transition ${
                    index < state.currentStep ? "bg-secondary" : "bg-primary/20"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-5 pb-16 sm:px-8">
        {state.currentStep === 0 && (
          <ServiceSelectionStep
            servicesWithDoctors={servicesWithDoctors}
            onSelect={handleServiceSelect}
            selected={state.service}
          />
        )}

        {state.currentStep === 1 && (
          <SlotSelectionStep
            availableSlots={availableSlots}
            onSelect={handleSlotSelect}
            selected={state.slot}
            onBack={handleBack}
          />
        )}

        {state.currentStep === 2 && (
          <NotesStep
            notes={state.notes}
            onChange={handleNotesChange}
            onNext={() => setState((prev) => ({ ...prev, currentStep: prev.currentStep + 1 }))}
            onBack={handleBack}
          />
        )}

        {state.currentStep === 3 && (
          <ConfirmationStep
            service={state.service}
            slot={state.slot}
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
        <h2 className="font-display text-2xl text-primary">Choose Your Service</h2>
        <p className="mt-2 text-base text-muted-foreground">
          Select the consultation type that fits your needs
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {servicesWithDoctors.map((service) => (
          <Card
            key={service.id}
            className={`cursor-pointer transition hover:-translate-y-1 hover:shadow-lg ${
              selected?.id === service.id ? "border-secondary ring-2 ring-secondary/20" : ""
            }`}
            onClick={() => onSelect(service)}
          >
            <CardHeader>
              <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-accent/35 text-primary">
                <FileText className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl">{service.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base leading-7 text-muted-foreground">{service.description}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="font-display text-xl text-secondary">
                  {service.currency} {service.price}
                </span>
                <Badge>{service.duration} min</Badge>
              </div>
              {service.doctors.length > 0 && (
                <div className="mt-4 pt-4 border-t border-primary/10">
                  <p className="text-sm font-bold text-muted-foreground mb-2">Available with:</p>
                  <div className="flex flex-wrap gap-2">
                    {service.doctors.map((doctor) => (
                      <div key={doctor.id} className="flex items-center gap-2 text-sm text-primary">
                        <User className="h-4 w-4" />
                        <span>{doctor.displayName || "Doctor"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SlotSelectionStep({
  availableSlots,
  onSelect,
  selected,
  onBack,
}: {
  availableSlots: DoctorSlotDocument[];
  onSelect: (slot: DoctorSlotDocument) => void;
  selected: DoctorSlotDocument | null;
  onBack: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl text-primary">Choose Your Time</h2>
          <p className="mt-2 text-base text-muted-foreground">
            Select a convenient slot for your consultation
          </p>
        </div>
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {availableSlots.map((slot) => (
          <Card
            key={slot.id}
            className={`cursor-pointer transition hover:-translate-y-1 hover:shadow-lg ${
              selected?.id === slot.id ? "border-secondary ring-2 ring-secondary/20" : ""
            }`}
            onClick={() => onSelect(slot)}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <Calendar className="h-5 w-5 text-secondary" />
                <span className="text-sm font-bold text-primary">
                  {slot.startTime.toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-secondary" />
                <span className="font-display text-xl text-primary">
                  {slot.startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl text-primary">Add Notes (Optional)</h2>
          <p className="mt-2 text-base text-muted-foreground">
            Share any concerns or context for your consultation
          </p>
        </div>
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <textarea
            value={notes}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Describe your symptoms, concerns, or any questions you have..."
            className="w-full h-40 rounded-2xl border border-primary/20 bg-white/70 p-4 text-base transition placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50 focus-visible:border-secondary/50"
            maxLength={500}
          />
          <p className="mt-2 text-xs text-muted-foreground text-right">
            {notes.length}/500
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} size="lg">
          Continue <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

function ConfirmationStep({
  service,
  slot,
  notes,
  onConfirm,
  onBack,
  loading,
  error,
}: {
  service: ServiceDocument | null;
  slot: DoctorSlotDocument | null;
  notes: string;
  onConfirm: () => void;
  onBack: () => void;
  loading: boolean;
  error: string | null;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl text-primary">Confirm Your Booking</h2>
          <p className="mt-2 text-base text-muted-foreground">
            Review your details before confirming
          </p>
        </div>
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Booking Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between border-b border-primary/10 pb-4">
            <span className="text-sm font-bold text-muted-foreground">Service</span>
            <span className="font-bold text-primary">{service?.title}</span>
          </div>
          <div className="flex justify-between border-b border-primary/10 pb-4">
            <span className="text-sm font-bold text-muted-foreground">Date</span>
            <span className="font-bold text-primary">{slot?.startTime.toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between border-b border-primary/10 pb-4">
            <span className="text-sm font-bold text-muted-foreground">Time</span>
            <span className="font-bold text-primary">
              {slot?.startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <div className="flex justify-between border-b border-primary/10 pb-4">
            <span className="text-sm font-bold text-muted-foreground">Duration</span>
            <span className="font-bold text-primary">{service?.duration} minutes</span>
          </div>
          <div className="flex justify-between border-b border-primary/10 pb-4">
            <span className="text-sm font-bold text-muted-foreground">Price</span>
            <span className="font-display text-xl text-secondary">
              {service?.currency} {service?.price}
            </span>
          </div>
          {notes && (
            <div className="pt-4">
              <span className="text-sm font-bold text-muted-foreground">Notes</span>
              <p className="mt-2 text-base text-primary">{notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 text-red-700 text-sm border border-red-200">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={onBack} disabled={loading}>
          Back
        </Button>
        <Button onClick={onConfirm} size="lg" disabled={loading}>
          {loading ? "Confirming..." : "Confirm Booking"}
        </Button>
      </div>
    </div>
  );
}
