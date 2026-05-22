"use client";

import { motion } from "framer-motion";
import { BarChart2, Video, CalendarCheck, FileText } from "lucide-react";

const techs = [
  {
    icon: BarChart2,
    title: "Guided Digital Vision Charts",
    body: "Standardised Snellen and LogMAR charts rendered digitally, with optometrist-guided viewing distance verification.",
    step: "01",
  },
  {
    icon: Video,
    title: "Live Video Refraction Protocol",
    body: "Real-time video consultation follows the same clinical workflow as an in-clinic refraction, with lens comparison and subjective feedback.",
    step: "02",
  },
  {
    icon: CalendarCheck,
    title: "Doctor-Reviewed Booking Approval",
    body: "Every appointment request is personally reviewed and confirmed by your optometrist — ensuring the right time, right doctor, and right service for your visit.",
    step: "03",
  },
  {
    icon: FileText,
    title: "Instant Digital Prescription",
    body: "Your signed, certified prescription is generated in seconds and delivered via email and WhatsApp. Valid at any optical store.",
    step: "04",
  },
];

export function TechnologySection() {
  return (
    <section id="technology" className="relative overflow-hidden bg-[#0a1c1b] py-24 lg:py-32">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-32 top-0 h-[500px] w-[500px] rounded-full bg-[#1a9e98]/10 blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-[#0f4f4b]/30 blur-[100px]" />
        {/* grid */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)", backgroundSize: "48px 48px" }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mb-16 max-w-2xl"
        >
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-[#2bb8b3]">Innovation</p>
          <h2 className="mb-5 text-4xl font-black leading-tight text-white lg:text-5xl">
            Next-Gen<br />Tele-Optometry
          </h2>
          <p className="text-lg leading-relaxed text-white/45">
            Precision, clinical validity, and digital convenience. Fused into one seamless experience.
          </p>
        </motion.div>

        <div className="grid gap-5 md:grid-cols-2">
          {techs.map((t, i) => {
            const Icon = t.icon;
            return (
              <motion.div
                key={t.title}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.65, delay: i * 0.12 }}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm transition hover:border-[#1a9e98]/30 hover:bg-white/8"
              >
                {/* Step number bg */}
                <span className="absolute right-6 top-4 text-5xl font-black text-white/5 select-none">{t.step}</span>

                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#1a9e98]/30 bg-[#1a9e98]/10 transition group-hover:bg-[#1a9e98]/18">
                  <Icon className="h-5 w-5 text-[#2bb8b3]" />
                </div>
                <h3 className="mb-3 text-lg font-bold text-white">{t.title}</h3>
                <p className="text-sm leading-relaxed text-white/50">{t.body}</p>

                {/* animated accent line */}
                <div className="mt-6 h-px w-0 bg-gradient-to-r from-[#1a9e98] to-transparent transition-all duration-500 group-hover:w-full" />
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 flex items-center gap-6"
        >
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#2bb8b3]" />
            <span className="text-sm text-white/45">Platform live across India</span>
          </div>
          <div className="h-4 w-px bg-white/15" />
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" style={{ animationDelay: "0.5s" }} />
            <span className="text-sm text-white/45">HIPAA-aligned data practices</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
