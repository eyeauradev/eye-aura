"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

function StatCard({
  end, suffix, prefix = "", label, sub, delay = 0,
}: { end: number; suffix: string; prefix?: string; label: string; sub: string; delay?: number }) {
  const [display, setDisplay] = useState("0");
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started.current) return;
        started.current = true;
        const duration = 2200;
        const startTime = Date.now();
        const tick = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          const val = Math.round(eased * end);
          setDisplay(`${prefix}${val}${suffix}`);
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, suffix, prefix]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.65, delay }}
      className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm"
    >
      <p className="mb-2 text-5xl font-black text-white lg:text-6xl">{display}</p>
      <p className="mb-1.5 text-sm font-semibold text-white/75">{label}</p>
      <p className="text-xs leading-relaxed text-white/40">{sub}</p>
    </motion.div>
  );
}

const stats = [
  { end: 550, suffix: "M+", label: "Indians need vision correction", sub: "Yet most go untreated for years" },
  { end: 72, suffix: "%", label: "Skip annual eye checkups", sub: "Due to cost, distance, or awareness" },
  { end: 4, suffix: " Weeks", label: "Average wait in tier-2 cities", sub: "For a basic optometry appointment" },
  { end: 0, suffix: "", prefix: "₹", label: "Cost of preventable blindness", sub: "If caught and treated in time" },
];

export function ProblemSection() {
  return (
    <section className="relative overflow-hidden bg-[#0a1c1b] py-24 lg:py-32">
      <div
        className="pointer-events-none absolute inset-0 opacity-15"
        style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.09) 1px, transparent 1px)", backgroundSize: "32px 32px" }}
      />
      <div className="absolute left-1/4 top-0 h-96 w-96 rounded-full bg-[#0f4f4b] opacity-25 blur-[100px]" />
      <div className="absolute bottom-0 right-1/4 h-64 w-80 rounded-full bg-[#1a9e98] opacity-12 blur-[80px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mb-16 max-w-2xl"
        >
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-[#2bb8b3]">The Reality</p>
          <h2 className="mb-5 text-4xl font-black leading-tight text-white lg:text-5xl">
            The Eye Care<br />Gap is Real.
          </h2>
          <p className="text-lg leading-relaxed text-white/45">
            Millions of Indians avoid eye care, not because they don't care,
            but because the system makes it hard.
          </p>
        </motion.div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <StatCard key={s.label} end={s.end} suffix={s.suffix} prefix={s.prefix}
              label={s.label} sub={s.sub} delay={i * 0.1} />
          ))}
        </div>
      </div>
    </section>
  );
}
