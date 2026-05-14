export type ConsultationService =
  | "visual-acuity-assessment"
  | "voice-consultation"
  | "video-consultation"
  | "contact-lens-consultation"
  | "digital-eye-strain-guidance";

export type ConsultationRequest = {
  id?: string;
  userId: string;
  service: ConsultationService;
  concern: string;
  preferredContact: "voice" | "video" | "whatsapp" | "email";
  createdAt: string;
};
