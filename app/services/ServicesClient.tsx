"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Eye,
  Phone,
  Video,
  ContactRound,
  Monitor,
  Stethoscope,
  ArrowRight,
  Clock,
  ChevronLeft,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

import { servicesService } from "@/services/firestore";
import type { ServiceDocument, ServiceType } from "@/types/firestore";
import { trackCtaClick } from "@/services/analytics/analytics.service";

// ─── Icon & tag maps (mirrors ServicesSection) ────────────────────────────────

const TYPE_ICON: Record<ServiceType, React.ElementType> = {
  visual_acuity_assessment: Eye,
  voice_consultation: Phone,
  video_consultation: Video,
  contact_lens_consultation: ContactRound,
  digital_eye_strain_guidance: Monitor,
};

const TYPE_TAG: Record<ServiceType, { label: string; color: string }> = {
  visual_acuity_assessment: {
    label: "Most Booked",
    color: "bg-[#0f4f4b] text-white",
  },
  video_consultation: { label: "Popular", color: "bg-[#1a9e98] text-white" },
  voice_consultation: {
    label: "Quick Consult",
    color: "bg-[#fff8ee] text-[#b5964d] border border-[#b5964d]/30",
  },
  contact_lens_consultation: {
    label: "Specialist",
    color: "bg-[#edf5f4] text-[#0f4f4b] border border-[#0f4f4b]/15",
  },
  digital_eye_strain_guidance: {
    label: "New",
    color: "bg-[#1a9e98] text-white",
  },
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-3xl border border-[#0f4f4b]/8 bg-white p-8 shadow-sm">
      <div className="mb-5 flex items-start justify-between">
        <div className="h-12 w-12 animate-pulse rounded-2xl bg-[#0f4f4b]/8" />
        <div className="h-6 w-20 animate-pulse rounded-full bg-[#0f4f4b]/8" />
      </div>
      <div className="mb-2 h-5 w-3/4 animate-pulse rounded-lg bg-[#0f4f4b]/8" />
      <div className="mb-1 h-4 w-full animate-pulse rounded-lg bg-[#0f4f4b]/5" />
      <div className="mb-1 h-4 w-5/6 animate-pulse rounded-lg bg-[#0f4f4b]/5" />
      <div className="mb-6 h-4 w-4/6 animate-pulse rounded-lg bg-[#0f4f4b]/5" />
      <div className="flex items-center justify-between border-t border-[#0f4f4b]/8 pt-4">
        <div className="h-6 w-16 animate-pulse rounded-lg bg-[#0f4f4b]/8" />
        <div className="h-5 w-12 animate-pulse rounded-full bg-[#0f4f4b]/5" />
      </div>
      <div className="mt-4 h-11 animate-pulse rounded-2xl bg-[#0f4f4b]/8" />
    </div>
  );
}

// ─── Service card ─────────────────────────────────────────────────────────────

function ServiceCard({
  svc,
  index,
}: {
  svc: ServiceDocument;
  index: number;
}) {
  const Icon = TYPE_ICON[svc.type] ?? Stethoscope;
  const tag = TYPE_TAG[svc.type] ?? {
    label: "Service",
    color: "bg-[#edf5f4] text-[#0f4f4b] border border-[#0f4f4b]/15",
  };
  const symbol = svc.currency === "INR" ? "₹" : svc.currency;
  const priceDisplay = `${symbol}${svc.price.toLocaleString("en-IN")}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.07 }}
      className="group flex flex-col rounded-3xl border border-[#0f4f4b]/8 bg-white p-8 shadow-sm transition hover:shadow-[0_16px_48px_rgba(15,79,75,0.12)]"
    >
      {/* Icon + tag */}
      <div className="mb-5 flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0f4f4b]/8 transition group-hover:bg-[#0f4f4b]/12">
          <Icon className="h-5 w-5 text-[#0f4f4b]" />
        </div>
        <span
          className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${tag.color}`}
        >
          {tag.label}
        </span>
      </div>

      {/* Title + description */}
      <h3 className="mb-2.5 text-lg font-bold text-[#0f4f4b]">{svc.title}</h3>
      <p className="mb-5 flex-1 text-sm leading-relaxed text-[#0f4f4b]/55">
        {svc.description}
      </p>

      {/* Suitable for */}
      {svc.suitableFor?.length > 0 && (
        <div className="mb-5">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#0f4f4b]/40">
            Suitable for
          </p>
          <ul className="space-y-1">
            {svc.suitableFor.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 text-xs text-[#0f4f4b]/55"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1a9e98]" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Price + duration */}
      <div className="flex items-center justify-between border-t border-[#0f4f4b]/8 pt-4">
        <span className="text-xl font-black text-[#0f4f4b]">{priceDisplay}</span>
        <span className="flex items-center gap-1 rounded-full bg-[#0f4f4b]/5 px-2.5 py-1 text-xs font-medium text-[#0f4f4b]/50">
          <Clock className="h-3 w-3" />
          {svc.duration} min
        </span>
      </div>

      {/* Book Now CTA */}
      <Link
        href="/booking"
        onClick={() =>
          trackCtaClick({
            label: `Book ${svc.title}`,
            location: "services_page",
          })
        }
        className="mt-5 flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#0f4f4b] text-sm font-semibold text-white shadow-sm transition hover:bg-[#0a3a36] active:scale-[0.98]"
      >
        Book Now <ArrowRight className="h-4 w-4" />
      </Link>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    servicesService
      .getActiveServices()
      .then(setServices)
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#f7f3ee]">
      {/* Minimal nav header */}
      <header className="border-b border-[#0f4f4b]/8 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/eye.png"
              alt="Eye Aura"
              width={36}
              height={36}
              className="rounded-full object-contain"
            />
            <span className="text-xs font-black uppercase tracking-[0.2em] text-[#0f4f4b]">
              Eye Aura
            </span>
          </Link>
          <span className="text-[#0f4f4b]/20">/</span>
          <span className="text-sm font-semibold text-[#0f4f4b]">Services</span>

          <div className="ml-auto">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs font-semibold text-[#0f4f4b]/55 transition hover:text-[#0f4f4b]"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="mb-4"
          >
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-[#0f4f4b]/45">
              What We Offer
            </p>
            <h1 className="mb-4 text-4xl font-black text-[#0f4f4b] lg:text-5xl">
              All Services
            </h1>
            <p className="max-w-xl text-lg text-[#0f4f4b]/55">
              Choose from our full range of digital eye care consultations.
              Every service is delivered by qualified specialists — from home.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Services grid */}
      <section className="pb-24 lg:pb-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array(6)
                .fill(0)
                .map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
            </div>
          ) : services.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((svc, i) => (
                <ServiceCard key={svc.id} svc={svc} index={i} />
              ))}
            </div>
          ) : (
            <div className="py-24 text-center">
              <p className="text-sm text-[#0f4f4b]/40">
                No services available at the moment. Check back soon.
              </p>
            </div>
          )}

          {/* Bottom CTA banner */}
          {!loading && services.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mt-16 rounded-3xl bg-[#0f4f4b] px-8 py-12 text-center"
            >
              <h2 className="mb-3 text-2xl font-black text-white lg:text-3xl">
                Not sure which service to pick?
              </h2>
              <p className="mb-8 text-base text-white/60">
                Our booking flow lets you select multiple services in one appointment.
              </p>
              <Link
                href="/booking"
                onClick={() =>
                  trackCtaClick({
                    label: "Book a Consultation",
                    location: "services_page_bottom",
                  })
                }
                className="inline-flex h-12 items-center gap-2 rounded-2xl bg-white px-8 text-sm font-bold text-[#0f4f4b] shadow-sm transition hover:bg-white/90 active:scale-[0.98]"
              >
                Book a Consultation <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}
