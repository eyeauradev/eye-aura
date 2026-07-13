import {
  CalendarCheck,
  Camera,
  CheckCircle2,
  Eye,
  Headphones,
  HeartHandshake,
  Laptop,
  MessageCircle,
  Moon,
  Sparkles,
  SunMedium,
  Video,
} from "lucide-react";

export const navItems = [
  { label: "Lifestyle", href: "#lifestyle" },
  { label: "Screening", href: "#screening" },
  { label: "Care", href: "#care" },
  { label: "Philosophy", href: "#philosophy" },
];

export const heroCards = [
  { label: "Digital Eye Wellness", icon: Sparkles },
  { label: "Video Consultation", icon: Video },
];

export const symptoms = [
  {
    title: "Screen Fatigue",
    text: "For long study sessions, coding days, content work, and endless tabs.",
    icon: Laptop,
  },
  {
    title: "Dry Eyes",
    text: "Gentle support for eyes that feel gritty, tired, or strained by indoor air.",
    icon: SunMedium,
  },
  {
    title: "Blurred Vision",
    text: "A calm first step when your focus starts fading through the day.",
    icon: Eye,
  },
  {
    title: "Headaches",
    text: "Understand patterns around light, posture, screen brightness, and strain.",
    icon: Moon,
  },
  {
    title: "Contact Lens Discomfort",
    text: "Personalized guidance for wear time, dryness, fit concerns, and routines.",
    icon: CheckCircle2,
  },
];

export const services = [
  {
    title: "Visual Acuity Assessment",
    description: "A guided online-first assessment pathway for clarity changes and screen-led strain.",
    suitableFor: "Students, remote teams, first-time checks",
    price: "From ₹499",
    icon: Eye,
  },
  {
    title: "Voice Consultation",
    description: "A calm audio session for quick guidance, follow-ups, and everyday eye concerns.",
    suitableFor: "Busy schedules, low-bandwidth days",
    price: "From ₹399",
    icon: Headphones,
  },
  {
    title: "Video Consultation",
    description: "Face-to-face digital care with space to explain symptoms without feeling rushed.",
    suitableFor: "Detailed concerns, personalized guidance",
    price: "From ₹699",
    icon: Video,
  },
  {
    title: "Contact Lens Consultation",
    description: "Support for lens comfort, hygiene routines, dryness, and practical wearing plans.",
    suitableFor: "New and regular lens users",
    price: "From ₹599",
    icon: Camera,
  },
  {
    title: "Digital Eye Strain Guidance",
    description: "A lifestyle-centered plan for screen fatigue, headaches, dryness, and recovery rituals.",
    suitableFor: "IT professionals, creators, gamers",
    price: "From ₹449",
    icon: Laptop,
  },
];

export const steps = [
  { title: "Choose Care", text: "Select the concern or care format that fits your day.", icon: Sparkles },
  { title: "Book Session", text: "Pick a calm time window and share your context.", icon: CalendarCheck },
  { title: "Consult Online", text: "Meet through voice or video from wherever you are.", icon: Video },
  { title: "Receive Guidance", text: "Leave with next steps, routines, and follow-up clarity.", icon: MessageCircle },
];
