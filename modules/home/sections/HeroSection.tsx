"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Check, Star } from "lucide-react";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] as any },
});

const bullets = [
  "Next-Gen Digital Eye Care",
  "Seamless Video Consultations",
  "Digital Experience for Every Age Group",
  "Affordable & Accessible Vision Care",
];

export function HeroSection({ user }: { user: any }) {
  const ctaHref = user ? `/${user.role}/dashboard` : "/booking";
  const ctaLabel = user ? "Go to Dashboard" : "Book Consultation";

  return (
    <section className="relative overflow-hidden pb-6 pt-24 sm:pb-8 sm:pt-28 md:pt-32 lg:pb-10 lg:pt-36">
      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-[#0f4f4b]/5 blur-[120px]" />
        <div className="absolute -right-20 top-1/4 h-[400px] w-[400px] rounded-full bg-[#b5964d]/8 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-12 lg:gap-16 lg:grid-cols-2 lg:items-center">
          {/* Left */}
          <div className="max-w-2xl">
            <motion.div {...fadeUp(0.1)}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#0f4f4b]/20 bg-[#0f4f4b]/5 px-4 py-2"
            >
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#1a9e98]" />
              <span className="text-xs font-semibold uppercase tracking-widest text-[#0f4f4b]">
                Tele-Optometry Platform
              </span>
            </motion.div>

            <motion.h1 {...fadeUp(0.18)}
              className="mb-6 text-5xl font-black leading-[1.06] tracking-tight text-[#0f4f4b] sm:text-6xl lg:text-7xl"
            >
              Digital Clarity,<br />
              <span className="bg-gradient-to-r from-[#0f4f4b] via-[#1a6e6a] to-[#2bb8b3] bg-clip-text text-transparent">
                Human Care.
              </span>
            </motion.h1>

            <motion.p {...fadeUp(0.28)}
              className="mb-8 text-lg leading-relaxed text-[#0f4f4b]/65 sm:text-xl"
            >
              Experience next-gen tele-optometry designed for modern India.
              Book a smart video consultation with a certified optometrist,
              anytime, anywhere.
            </motion.p>

            <motion.ul {...fadeUp(0.36)} className="mb-10 space-y-3">
              {bullets.map((b) => (
                <li key={b} className="flex items-center gap-3 text-sm font-medium text-[#0f4f4b]/75">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0f4f4b]/10">
                    <Check className="h-3 w-3 text-[#0f4f4b]" />
                  </span>
                  {b}
                </li>
              ))}
            </motion.ul>

            <motion.div {...fadeUp(0.44)} className="flex flex-wrap items-center gap-4">
              <Link href={ctaHref}
                className="inline-flex h-14 items-center gap-2 rounded-2xl bg-[#0f4f4b] px-8 text-base font-semibold text-white shadow-[0_8px_32px_rgba(15,79,75,0.35)] transition hover:bg-[#0a3a36] hover:shadow-[0_12px_40px_rgba(15,79,75,0.45)]"
              >{ctaLabel}</Link>
              <a href="#how-it-works"
                className="inline-flex h-14 items-center gap-2 rounded-2xl border border-[#0f4f4b]/20 px-8 text-base font-medium text-[#0f4f4b] transition hover:bg-[#0f4f4b]/5"
              >How It Works ↓</a>
            </motion.div>

            <motion.div {...fadeUp(0.52)} className="mt-10 flex items-center gap-4">
             
              <div>
                <div className="flex items-center gap-0.5">
                  {Array(5).fill(0).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-[#b5964d] text-[#b5964d]" />
                  ))}
                </div>
                <p className="text-xs text-[#0f4f4b]/55">Trusted by 2,000+ patients across India</p>
              </div>
            </motion.div>
          </div>

          {/* Right — doctor portrait */}
          <div className="relative flex items-center justify-center lg:justify-end">
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-[320px] overflow-hidden rounded-[2rem] sm:max-w-[400px]"
            >
              <Image
                src="/doctor_1.jpg"
                alt="Certified Optometrist at Eye Aura"
                width={400}
                height={520}
                className="h-auto w-full object-cover object-top"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a1c1b]/60 via-transparent to-transparent" />
              {/* Single clean bottom card */}
              <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/20 bg-white/12 p-4 backdrop-blur-md">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">Certified Optometrist</p>
                <p className="mt-1 text-lg font-bold text-white">Ms. Harshita, Eye Specialist</p>
                <p className="mt-1 text-xs text-white/55">Founder, Eye Aura</p>
              </div>
              {/* Live indicator */}
              <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-3 py-1.5 backdrop-blur-md">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
                <span className="text-[10px] font-semibold text-white">Consulting Now</span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
