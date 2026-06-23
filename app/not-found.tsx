"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Home, ArrowLeft, Phone } from "lucide-react";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
});

/** Animated "blinking" pupil that follows the mouse */
function EyeAnimation() {
  const eyeRef = useRef<HTMLDivElement>(null);
  const [pupil, setPupil] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const el = eyeRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const angle = Math.atan2(e.clientY - cy, e.clientX - cx);
      const dist = Math.min(14, Math.hypot(e.clientX - cx, e.clientY - cy) / 8);
      setPupil({ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist });
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  return (
    <div ref={eyeRef} className="relative mx-auto mb-8 flex h-36 w-36 items-center justify-center">
      {/* Outer glow ring */}
      <div className="absolute inset-0 rounded-full bg-[#0f4f4b]/10 blur-xl" />

      {/* Eyeball */}
      <div className="relative flex h-28 w-28 items-center justify-center rounded-full border-4 border-[#0f4f4b]/20 bg-white shadow-[0_8px_40px_rgba(15,79,75,0.18)]">
        {/* Iris */}
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#0f4f4b]">
          {/* Pupil — follows mouse */}
          <div
            className="h-8 w-8 rounded-full bg-[#060f0e] transition-transform duration-75"
            style={{ transform: `translate(${pupil.x}px, ${pupil.y}px)` }}
          >
            {/* Highlight */}
            <div className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-white/60" />
          </div>
          {/* Iris ring detail */}
          <div className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-[#1a9e98]/40" />
        </div>

        {/* Eyelid blink overlay — animates in on mount */}
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-full bg-[#f5f2ec]"
          initial={{ scaleY: 1 }}
          animate={{ scaleY: 0 }}
          transition={{ duration: 0.35, delay: 0.2, ease: "easeInOut" }}
          style={{ transformOrigin: "top" }}
        />
      </div>

      {/* Lashes — top */}
      {[-35, -20, 0, 20, 35].map((rot, i) => (
        <div
          key={i}
          className="absolute top-2 h-5 w-0.5 origin-bottom rounded-full bg-[#0f4f4b]/30"
          style={{ transform: `rotate(${rot}deg) translateY(-54px)` }}
        />
      ))}
    </div>
  );
}

export default function NotFound() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f5f2ec]">
      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-[#0f4f4b]/5 blur-[120px]" />
        <div className="absolute -right-20 bottom-0 h-[400px] w-[400px] rounded-full bg-[#b5964d]/8 blur-[100px]" />
        <div className="absolute left-1/2 top-1/3 h-[300px] w-[300px] -translate-x-1/2 rounded-full bg-[#1a9e98]/5 blur-[80px]" />
      </div>

      {/* Subtle dot-grid texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(circle, #0f4f4b 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Nav-style header */}
      <header className="relative z-10 flex items-center px-6 py-5 sm:px-10">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/eye-aura-logo.png"
            alt="Eye Aura"
            width={80}
            height={80}
            className="h-10 w-auto object-contain"
          />
        </Link>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex min-h-[calc(100vh-80px)] flex-col items-center justify-center px-4 pb-16 text-center">

        {/* Eye SVG — interactive */}
        <motion.div {...fadeUp(0)}>
          <EyeAnimation />
        </motion.div>

        {/* 404 number */}
        <motion.p
          {...fadeUp(0.1)}
          className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-[#0f4f4b]/40"
        >
          Error 404
        </motion.p>

        <motion.h1
          {...fadeUp(0.15)}
          className="mb-4 text-5xl font-black leading-tight text-[#0f4f4b] sm:text-6xl lg:text-7xl"
          style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
        >
          Page Out of Focus
        </motion.h1>

        <motion.p
          {...fadeUp(0.22)}
          className="mb-10 max-w-md text-base leading-relaxed text-[#0f4f4b]/55 sm:text-lg"
        >
          The page you're looking for seems blurry — or maybe it moved.
          Let's get your vision back on track.
        </motion.p>

        {/* CTA buttons */}
        <motion.div {...fadeUp(0.3)} className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#0f4f4b] px-7 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0a3a36]"
          >
            <Home className="h-4 w-4" />
            Back to Home
          </Link>
          <Link
            href="/booking"
            className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[#0f4f4b]/20 bg-white px-7 text-sm font-semibold text-[#0f4f4b] shadow-sm transition hover:border-[#0f4f4b]/40 hover:bg-[#f0ede8]"
          >
            Book a Consultation
          </Link>
        </motion.div>

        {/* Quick links */}
        <motion.div
          {...fadeUp(0.38)}
          className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-[#0f4f4b]/40"
        >
          {[
            { label: "Services", href: "/#services" },
            { label: "How It Works", href: "/#how-it-works" },
            { label: "About Us", href: "/#founder" },
            { label: "Contact", href: "https://wa.me/917042092967" },
          ].map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className="transition hover:text-[#0f4f4b]"
            >
              {label}
            </Link>
          ))}
        </motion.div>

        {/* Gold accent rule */}
        <motion.div
          {...fadeUp(0.44)}
          className="mt-14 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#0f4f4b]/30"
        >
          <div className="h-px w-8 bg-[#b5964d]/40" />
          Eye Aura · Digital Eye Wellness
          <div className="h-px w-8 bg-[#b5964d]/40" />
        </motion.div>
      </main>
    </div>
  );
}
