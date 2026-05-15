"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { bookingRequestsService } from "@/services/firestore/booking-requests.service";
import { servicesService, usersService, doctorAvailabilityService } from "@/services/firestore";
import type { ServiceDocument, UserDocument, DoctorAvailabilityDocument } from "@/types/firestore";
import type { BookingState, BookingStep } from "@/types/booking";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Calendar, Clock, Check, FileText, User, Star } from "lucide-react";

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
      console.error("Failed to load services:", error);
    }
  };

  // Redirect if not authenticated
  if (!authLoading && !user) {
    router.push("/auth/login");
    return null;
  }

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
      console.error("Failed to load doctor availability:", error);
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

    setState({ ...state, loading: true, error: null });

    try {
      // Create booking request instead of appointment
      const bookingRequest = await bookingRequestsService.create({
        patientId: user.id,
        doctorId: state.doctor.id,
        serviceId: state.service.id,
        requestedTime: selectedTime,
        status: "requested",
        notes: state.notes,
      });

      router.push(`/booking/request-submitted/${bookingRequest.id}`);
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
          <h1 className="font-display text-3xl text-primary sm:text-4xl">Request Consultation</h1>
          <p className="mt-2 text-base text-muted-foreground">
            Submit a booking request for doctor approval
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
  const serviceWithDoctors = servicesWithDoctors.find(s => s.id === service?.id);
  const doctors = serviceWithDoctors?.doctors || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl text-primary">Choose Your Doctor</h2>
          <p className="mt-2 text-base text-muted-foreground">
            Select a doctor for your {service?.title}
          </p>
        </div>
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
      </div>

      {doctors.length === 0 ? (
        <Card className="border-primary/10 bg-primary/5">
          <CardContent className="p-8 text-center">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-base text-muted-foreground mb-2">
              No doctors available for this service yet
            </p>
            <p className="text-sm text-muted-foreground">
              Please contact support or try a different service
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {doctors.map((doctor) => (
            <Card
              key={doctor.id}
              className={`cursor-pointer transition hover:-translate-y-1 hover:shadow-lg ${
                selected?.id === doctor.id ? "border-secondary ring-2 ring-secondary/20" : ""
              }`}
              onClick={() => onSelect(doctor)}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="h-14 w-14 rounded-full bg-secondary/15 flex items-center justify-center text-secondary shrink-0">
                    {doctor.displayName?.charAt(0).toUpperCase() || "D"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-primary text-lg">{doctor.displayName || "Doctor"}</h3>
                    <p className="text-sm text-muted-foreground">{doctor.email}</p>
                    <div className="mt-3 flex items-center gap-1">
                      <Star className="h-4 w-4 fill-secondary text-secondary" />
                      <span className="text-sm font-bold text-primary">4.9</span>
                      <span className="text-xs text-muted-foreground">(120 reviews)</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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
  // Generate available time slots for the next 2 weeks
  const generateTimeSlots = () => {
    const slots: Date[] = [];
    const today = new Date();
    const twoWeeksLater = new Date();
    twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);

    const dayMap: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };

    let currentDate = new Date(today);
    while (currentDate <= twoWeeksLater) {
      const dayOfWeek = currentDate.getDay();
      
      // Find availability for this day
      const dayName = Object.keys(dayMap).find(key => dayMap[key] === dayOfWeek);
      const availability = doctorAvailability.find(a => a.dayOfWeek === dayName && !a.isOff);

      if (availability && dayName) {
        availability.timeRanges.forEach((range) => {
          const [startHours, startMinutes] = range.startTime.split(":").map(Number);
          const [endHours, endMinutes] = range.endTime.split(":").map(Number);

          const startTime = new Date(currentDate);
          startTime.setHours(startHours, startMinutes, 0, 0);

          const endTime = new Date(currentDate);
          endTime.setHours(endHours, endMinutes, 0, 0);

          // Generate slots at the configured duration
          let slotStart = new Date(startTime);
          while (slotStart.getTime() + availability.duration * 60000 <= endTime.getTime()) {
            // Only add slots that are in the future
            if (slotStart > new Date()) {
              slots.push(new Date(slotStart));
            }
            slotStart = new Date(slotStart.getTime() + availability.duration * 60000);
          }
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return slots.slice(0, 50); // Limit to first 50 slots
  };

  const timeSlots = generateTimeSlots();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl text-primary">Choose Your Time</h2>
          <p className="mt-2 text-base text-muted-foreground">
            Select a convenient time for your consultation
          </p>
        </div>
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
      </div>

      {timeSlots.length === 0 ? (
        <Card className="border-primary/10 bg-primary/5">
          <CardContent className="p-8 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-base text-muted-foreground mb-2">
              No available time slots in the next 2 weeks
            </p>
            <p className="text-sm text-muted-foreground">
              The doctor may have limited availability or be fully booked
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {timeSlots.map((time, index) => (
            <Card
              key={index}
              className={`cursor-pointer transition hover:-translate-y-1 hover:shadow-lg ${
                selected?.getTime() === time.getTime() ? "border-secondary ring-2 ring-secondary/20" : ""
              }`}
              onClick={() => onSelect(time)}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Calendar className="h-5 w-5 text-secondary" />
                  <span className="text-sm font-bold text-primary">
                    {time.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-secondary" />
                  <span className="font-display text-xl text-primary">
                    {time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
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
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl text-primary">Submit Booking Request</h2>
          <p className="mt-2 text-base text-muted-foreground">
            Review your details before submitting
          </p>
        </div>
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
      </div>

      <Card className="border-primary/10 bg-gradient-to-br from-white/50 to-white/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-secondary" />
            Request Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
              <p className="text-xs font-bold text-muted-foreground mb-1">Service</p>
              <p className="font-bold text-primary text-lg">{service?.title}</p>
              <p className="text-sm text-muted-foreground mt-1">{service?.duration} minutes</p>
            </div>
            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
              <p className="text-xs font-bold text-muted-foreground mb-1">Doctor</p>
              <p className="font-bold text-primary text-lg">{doctor?.displayName || "Doctor"}</p>
              <p className="text-sm text-muted-foreground mt-1">{doctor?.email}</p>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
              <p className="text-xs font-bold text-muted-foreground mb-1">Requested Date</p>
              <p className="font-bold text-primary text-lg">{selectedTime?.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</p>
            </div>
            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
              <p className="text-xs font-bold text-muted-foreground mb-1">Requested Time</p>
              <p className="font-bold text-primary text-lg">
                {selectedTime?.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-secondary/10 border border-secondary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground mb-1">Total Amount</p>
                <p className="font-display text-3xl text-secondary">
                  {service?.currency} {service?.price}
                </p>
              </div>
              <Badge className="bg-secondary text-white border-secondary">Payment on Consultation</Badge>
            </div>
          </div>

          {notes && (
            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
              <p className="text-xs font-bold text-muted-foreground mb-2">Your Notes</p>
              <p className="text-base text-primary">{notes}</p>
            </div>
          )}

          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
            <p className="text-sm font-bold text-amber-800 mb-1">
              ⚠️ Request Pending Approval
            </p>
            <p className="text-xs text-amber-700">
              Your booking request will be reviewed by the doctor. You'll receive a notification once it's accepted or if a reschedule is needed.
            </p>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 text-red-700 text-sm border border-red-200">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={onBack} disabled={loading} size="lg">
          Back
        </Button>
        <Button onClick={onConfirm} size="lg" disabled={loading} className="min-w-[200px]">
          {loading ? "Submitting..." : "Submit Request"}
        </Button>
      </div>
    </div>
  );
}
