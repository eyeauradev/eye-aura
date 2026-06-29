"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const audiences = [
  {
    label: "Gen Z & Students",
    pain: "Screen fatigue from 8+ hours of study and social media",
    solution: "Quick 30-min digital check-up between classes. Prescriptions delivered to your inbox.",
    img: "/genz-students.jpg",
    accent: "#1a9e98",
    bg: "bg-[#edf5f4]",
  },
  {
    label: "Working Professionals",
    pain: "No time for clinic visits - vision issues ignored for months",
    solution: "Evening or weekend slots. Book in 60 seconds from your phone, laptop, or tablet.",
    img: "/working-professionals.jpg",
    accent: "#0f4f4b",
    bg: "bg-[#f5f2ec]",
  },
  {
    label: "Parents & Families",
    pain: "Kids' eyesight changing rapidly - hard to track without regular checks",
    solution: "Family consultations from home. Monitor all family members with a single booking.",
    img: "/parents-families.jpg",
    accent: "#b5964d",
    bg: "bg-[#fff8ee]",
  },
  {
    label: "Senior Citizens",
    pain: "Mobility limitations make clinic visits exhausting and difficult",
    solution: "Simple video calls with gentle guidance. Family member can join the session too.",
    img: "/senior-citizens.jpg",
    accent: "#0f4f4b",
    bg: "bg-[#edf5f4]",
  },
];

export function GenerationsSection() {
  return (
    <section className="bg-white py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mb-16 text-center"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-[#0f4f4b]/45">For Everyone</p>
          <h2 className="mb-4 text-4xl font-black text-[#0f4f4b] lg:text-5xl">
            Built for Every<br />Generation
          </h2>
          <p className="mx-auto max-w-xl text-lg text-[#0f4f4b]/55">
            Eye care that adapts to you, not the other way around.
          </p>
        </motion.div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {audiences.map((a, i) => (
            <motion.div
              key={a.label}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.65, delay: i * 0.1 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className={`overflow-hidden rounded-3xl ${a.bg}`}
            >
              <div className="relative h-44 overflow-hidden">
                <Image
                  src={a.img}
                  alt={a.label}
                  fill
                  className="object-cover transition duration-500 hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute bottom-3 left-4">
                  <span
                    className="rounded-full px-3 py-1 text-xs font-bold text-white"
                    style={{ backgroundColor: a.accent }}
                  >{a.label}</span>
                </div>
              </div>
              <div className="p-6">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#0f4f4b]/45">Pain Point</p>
                <p className="mb-4 text-sm font-medium text-[#0f4f4b]/70">{a.pain}</p>
                <div className="mb-4 h-px bg-[#0f4f4b]/10" />
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#0f4f4b]/45">Eye Aura Solution</p>
                <p className="text-sm leading-relaxed text-[#0f4f4b]/65">{a.solution}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
