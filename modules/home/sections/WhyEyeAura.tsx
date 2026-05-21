"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Home, Monitor, IndianRupee, Clock, Stethoscope } from "lucide-react";

const features = [
  {
    icon: ShieldCheck,
    title: "Certified Optometrists",
    body: "Every consultation is led by a registered, qualified optometrist. Your vision is never assessed by an algorithm alone.",
  },
  {
    icon: Home,
    title: "True At-Home Care",
    body: "No waiting rooms. No travel. No clinic appointments. The full consultation happens from wherever you are comfortable.",
  },
  {
    icon: Monitor,
    title: "Works on Any Device",
    body: "Phone, tablet, laptop - Eye Aura is fully optimised for any screen size. You don't need special hardware.",
  },
  {
    icon: IndianRupee,
    title: "Genuinely Affordable",
    body: "Priced fairly for Indian households. No hidden fees, no clinic surcharges, no markup on prescriptions.",
  },
  {
    icon: Clock,
    title: "Results in Minutes",
    body: "Your digital prescription and eye wellness report are generated and shared instantly at the end of your session.",
  },
  {
    icon: Stethoscope,
    title: "Clinically Valid",
    body: "Our protocol follows standardised optometry examination procedures. Prescriptions are accepted at all major optical stores.",
  },
];

export function WhyEyeAura() {
  return (
    <section className="bg-[#f7f3ee] py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-16 lg:grid-cols-[1fr_2fr] lg:items-start">
          {/* Left: sticky title block */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="lg:sticky lg:top-32"
          >
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-[#0f4f4b]/45">Why Eye Aura</p>
            <h2 className="mb-6 text-4xl font-black leading-tight text-[#0f4f4b] lg:text-5xl">
              Healthcare<br />Infrastructure<br />
              <span className="text-[#1a9e98]">meets</span><br />
              Human Care.
            </h2>
            <p className="text-base leading-relaxed text-[#0f4f4b]/55">
              We built Eye Aura to close the gap between what modern eye care should feel like and what it actually is today.
            </p>
            <div className="mt-8">
              <a href="/booking"
                className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#0f4f4b] px-7 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0a3a36]"
              >Start Your Consultation</a>
            </div>
          </motion.div>

          {/* Right: feature grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.09 }}
                  className="group rounded-3xl border border-[#0f4f4b]/8 bg-white p-7 shadow-sm transition hover:shadow-[0_12px_40px_rgba(15,79,75,0.1)]"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0f4f4b]/8 transition group-hover:bg-[#0f4f4b]/14">
                    <Icon className="h-5 w-5 text-[#0f4f4b]" />
                  </div>
                  <h3 className="mb-2.5 text-base font-bold text-[#0f4f4b]">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-[#0f4f4b]/55">{f.body}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
