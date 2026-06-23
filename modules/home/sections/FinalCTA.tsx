"use client";

import { motion } from "framer-motion";
import { Phone } from "lucide-react";
import { trackCtaClick } from "@/services/analytics/analytics.service";

export function FinalCTA({ user }: { user: any }) {
  return (
    <section className="relative overflow-hidden bg-[#0a1c1b] py-24 lg:py-36">
      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-0 h-80 w-80 rounded-full bg-[#1a9e98]/15 blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-[#0f4f4b]/40 blur-[100px]" />
        <div className="absolute inset-0 opacity-8"
          style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)", backgroundSize: "32px 32px" }}
        />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-6 text-xs font-semibold uppercase tracking-[0.3em] text-[#2bb8b3]"
        >Begin Today</motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.75, delay: 0.1 }}
          className="mb-6 text-5xl font-black leading-tight text-white lg:text-7xl"
          style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
        >
          Your Vision.<br />
          <span className="text-transparent" style={{ WebkitTextStroke: "1px rgba(255,255,255,0.4)" }}>Our Priority.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65, delay: 0.2 }}
          className="mx-auto mb-12 max-w-lg text-xl leading-relaxed text-white/50"
        >
          Book your eye consultation today, in under 2 minutes.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65, delay: 0.3 }}
          className="flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <a href={user ? `/${user.role}/dashboard` : "/booking"}
            onClick={() => trackCtaClick({ label: user ? "Go to Dashboard" : "Book Free Consultation", location: "final_cta" })}
            className="inline-flex h-14 items-center gap-2.5 rounded-2xl bg-white px-10 text-base font-bold text-[#0f4f4b] shadow-[0_8px_40px_rgba(255,255,255,0.2)] transition hover:bg-white/90"
          >
            {user ? "Go to Dashboard" : "Book Free Consultation"}
          </a>

          <a href="https://wa.me/917042092967" target="_blank" rel="noopener noreferrer"
            onClick={() => trackCtaClick({ label: "WhatsApp Us", location: "final_cta" })}
            className="inline-flex h-14 items-center gap-2.5 rounded-2xl border border-white/20 bg-white/8 px-8 text-base font-semibold text-white backdrop-blur-sm transition hover:bg-white/14"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.849L0 24l6.334-1.508A11.946 11.946 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.96 0-3.8-.534-5.376-1.465l-.385-.227-3.982.948.983-3.881-.253-.4A9.957 9.957 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
            </svg>
            WhatsApp Us
          </a>

          <a href="tel:+91 7042092967"
            onClick={() => trackCtaClick({ label: "Call +91 7042092967", location: "final_cta" })}
            className="inline-flex h-14 items-center gap-2.5 rounded-2xl border border-white/20 bg-white/8 px-8 text-base font-semibold text-white backdrop-blur-sm transition hover:bg-white/14"
          >
            <Phone className="h-4 w-4" />
            +91 7042092967
          </a>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-10 text-sm text-white/30"
        >
          Available pan-India · Mon–Sat, 9 AM – 8 PM · WhatsApp support 7 days
        </motion.p>
      </div>
    </section>
  );
}
