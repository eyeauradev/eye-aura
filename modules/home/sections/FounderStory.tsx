"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const view = { initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as any } };

const cards = [
  {
    step: "01",
    title: "The Problem Closer to Home",
    body: "My own family struggled to get basic eye care. No nearby optometrist. Long waits. Expensive consultations. I realised this wasn't rare. It was the reality for millions across India.",
    bg: "bg-[#fff8ee]",
  },
  {
    step: "02",
    title: "The Realisation",
    body: "The pandemic proved consultations don't need to be in-person. The tools exist. The technology works. What was missing was a system designed specifically around eye care.",
    bg: "bg-[#edf5f4]",
  },
  {
    step: "03",
    title: "The Mission",
    body: "Eye Aura was built to make certified optometry accessible, dignified, and digital. For every Indian, regardless of where they live.",
    bg: "bg-[#f0ede8]",
  },
];

export function FounderStory() {
  return (
    <section id="founder" className="bg-[#f5f2ec] py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.p {...view} className="mb-16 text-center text-xs font-semibold uppercase tracking-[0.28em] text-[#0f4f4b]/45">
          Our Story
        </motion.p>

        {/* Split layout */}
        <div className="mb-20 grid gap-12 lg:grid-cols-2 lg:items-center">
          {/* Portrait */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="relative h-[500px] overflow-hidden rounded-3xl shadow-[0_32px_80px_rgba(15,79,75,0.20)]">
              <Image
                src="/doctor_2.png"
                alt="Harshita, Founder of Eye Aura"
                fill
                className="object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a1c1b]/50 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 rounded-2xl border border-white/20 bg-white/12 px-5 py-3 backdrop-blur-md">
                <p className="text-sm font-bold text-white">Ms. Harshita</p>
                <p className="text-xs text-white/65">Founder & Optometrist, Eye Aura</p>
              </div>
            </div>
          </motion.div>

          {/* Founder story */}
          <motion.div {...view} className="flex flex-col justify-center">
            {/* Primary heading */}
            <h2
              className="mb-4 text-3xl font-semibold leading-snug text-[#0f4f4b] lg:text-4xl"
              style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
            >
              Inspired by a Real Problem
            </h2>
            <p className="mb-10 text-base leading-relaxed text-[#0f4f4b]/65">
              Even my own family faced long delays in accessing basic eye care—my mother waited
              a week for an eye check-up, while my sister waited a month just to update her
              spectacles.
            </p>

            {/* Secondary heading */}
            <h3
              className="mb-4 text-2xl font-medium leading-snug text-[#0f4f4b] lg:text-3xl"
              style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
            >
              Bridging the Accessibility Gap
            </h3>
            <p className="mb-10 text-base leading-relaxed text-[#0f4f4b]/65">
              As an optometrist, I realized that quality eye care often remains out of reach due
              to travel, waiting times, and limited access to specialists.
            </p>

            {/* Attribution — same style as original */}
            <div>
              <div className="mb-3 h-px w-10 bg-[#b5964d]" />
              <cite className="not-italic text-sm font-semibold uppercase tracking-[0.2em] text-[#0f4f4b]/50">
                Harshita, Founder &amp; Optometrist
              </cite>
            </div>
          </motion.div>
        </div>

        {/* Story cards */}
        <div className="grid gap-5 md:grid-cols-3">
          {cards.map((c, i) => (
            <motion.div
              key={c.step}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.12 }}
              className={`rounded-3xl ${c.bg} p-8`}
            >
              <span className="mb-5 block text-4xl font-black text-[#0f4f4b]/10">{c.step}</span>
              <h3 className="mb-3 text-lg font-bold text-[#0f4f4b]">{c.title}</h3>
              <p className="text-sm leading-relaxed text-[#0f4f4b]/60">{c.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
