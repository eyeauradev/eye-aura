"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { bookingRequestsService } from "@/services/firestore/booking-requests.service";
import { getDisplayError, logError, ERROR_CODES } from "@/lib/errors";
import { useToast } from "@/components/ui/toast-provider";
import type { BookingRequestDocument } from "@/types/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, ArrowRight, Home } from "lucide-react";


export default function RequestSubmittedPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { errorFromAppError } = useToast();
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<BookingRequestDocument | null>(null);
  const [requestId, setRequestId] = useState<string>("");

  useEffect(() => {
    async function loadParams() {
      const resolvedParams = await params;
      setRequestId(resolvedParams.id);
    }
    loadParams();
  }, [params]);

  useEffect(() => {
    if (!requestId) return;

    async function loadRequest() {
      try {
        const requestData = await bookingRequestsService.getById(requestId);
        setRequest(requestData);
      } catch (error) {
        const appError = getDisplayError(error, ERROR_CODES.SYSTEM.UNEXPECTED);
        logError(appError.code, error, "RequestSubmittedPage");
        errorFromAppError(appError);
      } finally {
        setLoading(false);
      }
    }

    loadRequest();
  }, [requestId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F4EF] via-[#DDE5DF] to-[#F7F4EF]">
      <div className="mx-auto max-w-2xl px-5 py-16 sm:px-8">
        
          <Card className="border-primary/10 bg-white/80">
            <CardHeader className="text-center pb-8">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-secondary/15">
                <CheckCircle className="h-10 w-10 text-secondary" />
              </div>
              <CardTitle className="text-3xl text-primary">Request Submitted</CardTitle>
              <p className="mt-3 text-base text-muted-foreground">
                Your booking request has been sent to the doctor for review
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-900 mb-1">Pending Approval</p>
                    <p className="text-sm text-amber-800">
                      The doctor will review your request and either accept it or propose a different time if needed. You'll receive a notification once there's an update.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10">
                <p className="text-sm font-bold text-muted-foreground mb-3">What happens next:</p>
                <ul className="space-y-2 text-sm text-primary">
                  <li className="flex items-start gap-2">
                    <span className="text-secondary mt-0.5">•</span>
                    <span>Doctor reviews your request within 24-48 hours</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-secondary mt-0.5">•</span>
                    <span>If accepted, your appointment is confirmed</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-secondary mt-0.5">•</span>
                    <span>If reschedule needed, doctor will propose a new time</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-secondary mt-0.5">•</span>
                    <span>You'll receive email notifications for all updates</span>
                  </li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.push("/patient/dashboard")}
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go to Dashboard
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => router.push("/booking")}
                >
                  Book Another
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        
      </div>
    </div>
  );
}
