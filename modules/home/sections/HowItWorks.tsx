"use client";

import { motion } from "framer-motion";
import { Calendar, Video, FileCheck } from "lucide-react";

const steps = [
  {
    n: "01",
    icon: Calendar,
    title: "Book in Seconds",
    body: "Choose a time that works for you. Book online, via WhatsApp, or call us. No queues, no clinic visits required.",
    tag: "Under 2 minutes",
    color: "bg-[#edf5f4]",
    iconBg: "bg-[#0f4f4b]",
  },
  {
    n: "02",
    icon: Video,
    title: "Video Consultation",
    body: "Join a live video call with our certified optometrist. We guide you through a structured, clinically valid eye assessment from home.",
    tag: "30–45 min session",
    color: "bg-[#fff8ee]",
    iconBg: "bg-[#b5964d]",
  },
  {
    n: "03",
    icon: FileCheck,
    title: "Get Results & Prescription",
    body: "Receive your digital prescription and a personalised eye wellness report instantly. Share it anywhere: doctor, optician, or store.",
    tag: "Instant delivery",
    color: "bg-[#f5f2ec]",
    iconBg: "bg-[#1a9e98]",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-white py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mb-16 text-center"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-[#0f4f4b]/45">Simple Process</p>
          <h2 className="mb-4 text-4xl font-black text-[#0f4f4b] lg:text-5xl">How It Works</h2>
          <p className="mx-auto max-w-xl text-lg text-[#0f4f4b]/55">
            Tele-optometry made so simple, your first visit takes less time than a lunch break.
          </p>
        </motion.div>

        <div className="relative grid gap-6 md:grid-cols-3">
          {/* Connector lines (desktop) */}
          <div className="absolute left-[33.3%] right-[33.3%] top-16 hidden h-px bg-gradient-to-r from-[#0f4f4b]/20 via-[#1a9e98]/40 to-[#0f4f4b]/20 md:block" />

          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.n}
                initial={{ opacity: 0, y: 36 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.65, delay: i * 0.14 }}
                className={`relative rounded-3xl ${step.color} p-8`}
              >
                <div className="mb-6 flex items-center justify-between">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${step.iconBg}`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-4xl font-black text-[#0f4f4b]/10">{step.n}</span>
                </div>
                <h3 className="mb-3 text-xl font-bold text-[#0f4f4b]">{step.title}</h3>
                <p className="mb-5 text-sm leading-relaxed text-[#0f4f4b]/60">{step.body}</p>
                <span className="inline-block rounded-full border border-[#0f4f4b]/15 bg-white/60 px-3 py-1 text-xs font-semibold text-[#0f4f4b]/65 backdrop-blur-sm">
                  {step.tag}
                </span>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
        >
          <a href="https://wa.me/917042092967" target="_blank" rel="noopener noreferrer"
            className="inline-flex h-12 items-center gap-2.5 rounded-2xl bg-green-500 px-7 text-sm font-semibold text-white shadow-sm transition hover:bg-green-600"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.849L0 24l6.334-1.508A11.946 11.946 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.96 0-3.8-.534-5.376-1.465l-.385-.227-3.982.948.983-3.881-.253-.4A9.957 9.957 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
            </svg>
            WhatsApp to Book
          </a>
          <a href="/booking"
            className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#0f4f4b] px-7 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0a3a36]"
          >Book Online Now</a>
        </motion.div>
      </div>
    </section>
  );
}
