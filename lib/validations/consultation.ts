import { z } from "zod";

export const consultationRequestSchema = z.object({
  service: z.enum([
    "visual-acuity-assessment",
    "voice-consultation",
    "video-consultation",
    "contact-lens-consultation",
    "digital-eye-strain-guidance",
  ]),
  concern: z.string().min(10, "Please share a little more about your concern."),
  preferredContact: z.enum(["voice", "video", "whatsapp", "email"]),
});

export type ConsultationRequestInput = z.infer<typeof consultationRequestSchema>;
