"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Eye, Phone, Video, ContactRound, Monitor, Stethoscope } from "lucide-react";

import { servicesService } from "@/services/firestore";
import type { ServiceDocument, ServiceType } from "@/types/firestore";
import { trackCtaClick } from "@/services/analytics/analytics.service";

const TYPE_ICON: Record<ServiceType, React.ElementType> = {
  visual_acuity_assessment: Eye,
  voice_consultation: Phone,
  video_consultation: Video,
  contact_lens_consultation: ContactRound,
  digital_eye_strain_guidance: Monitor,
};

const TYPE_TAG: Record<ServiceType, { label: string; color: string }> = {
  visual_acuity_assessment: { label: "Most Booked", color: "bg-[#0f4f4b] text-white" },
  video_consultation: { label: "Popular", color: "bg-[#1a9e98] text-white" },
  voice_consultation: { label: "Quick Consult", color: "bg-[#fff8ee] text-[#b5964d] border border-[#b5964d]/30" },
  contact_lens_consultation: { label: "Specialist", color: "bg-[#edf5f4] text-[#0f4f4b] border border-[#0f4f4b]/15" },
  digital_eye_strain_guidance: { label: "New", color: "bg-[#1a9e98] text-white" },
};

function ServiceCard({ svc, index }: { svc: ServiceDocument; index: number }) {
  const Icon = TYPE_ICON[svc.type] ?? Stethoscope;
  const tag = TYPE_TAG[svc.type] ?? { label: "Service", color: "bg-[#edf5f4] text-[#0f4f4b] border border-[#0f4f4b]/15" };
  const symbol = svc.currency === "INR" ? "₹" : svc.currency;
  const priceDisplay = `${symbol}${svc.price.toLocaleString("en-IN")}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group flex flex-col rounded-3xl border border-[#0f4f4b]/8 bg-white p-8 shadow-sm transition hover:shadow-[0_16px_48px_rgba(15,79,75,0.12)]"
    >
      <div className="mb-5 flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0f4f4b]/8 transition group-hover:bg-[#0f4f4b]/12">
          <Icon className="h-5 w-5 text-[#0f4f4b]" />
        </div>
        <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${tag.color}`}>
          {tag.label}
        </span>
      </div>

      <h3 className="mb-2.5 text-lg font-bold text-[#0f4f4b]">{svc.title}</h3>
      <p className="mb-5 flex-1 text-sm leading-relaxed text-[#0f4f4b]/55">{svc.description}</p>

      <div className="flex items-center justify-between border-t border-[#0f4f4b]/8 pt-4">
        <span className="text-xl font-black text-[#0f4f4b]">{priceDisplay}</span>
        <span className="rounded-full bg-[#0f4f4b]/5 px-2.5 py-1 text-xs font-medium text-[#0f4f4b]/50">
          {svc.duration} min
        </span>
      </div>
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-3xl border border-[#0f4f4b]/8 bg-white p-8 shadow-sm">
      <div className="mb-5 flex items-start justify-between">
        <div className="h-12 w-12 animate-pulse rounded-2xl bg-[#0f4f4b]/8" />
        <div className="h-6 w-20 animate-pulse rounded-full bg-[#0f4f4b]/8" />
      </div>
      <div className="mb-2 h-5 w-3/4 animate-pulse rounded-lg bg-[#0f4f4b]/8" />
      <div className="mb-1 h-4 w-full animate-pulse rounded-lg bg-[#0f4f4b]/5" />
      <div className="mb-5 h-4 w-5/6 animate-pulse rounded-lg bg-[#0f4f4b]/5" />
      <div className="flex items-center justify-between border-t border-[#0f4f4b]/8 pt-4">
        <div className="h-6 w-16 animate-pulse rounded-lg bg-[#0f4f4b]/8" />
        <div className="h-5 w-12 animate-pulse rounded-full bg-[#0f4f4b]/5" />
      </div>
    </div>
  );
}

export function ServicesSection() {
  const [services, setServices] = useState<ServiceDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    servicesService
      .getActiveServices()
      .then((all) => setServices(all.slice(0, 3)))
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section id="services" className="bg-[#f7f3ee] py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mb-16"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-[#0f4f4b]/45">What We Offer</p>
          <h2 className="mb-4 text-4xl font-black text-[#0f4f4b] lg:text-5xl">Our Services</h2>
          <p className="max-w-xl text-lg text-[#0f4f4b]/55">
            A complete digital eye care ecosystem, from basic vision checks to specialised consultations.
          </p>
        </motion.div>

        <div className="grid gap-5 md:grid-cols-3">
          {loading ? (
            Array(3).fill(0).map((_, i) => <SkeletonCard key={i} />)
          ) : services.length > 0 ? (
            services.map((svc, i) => <ServiceCard key={svc.id} svc={svc} index={i} />)
          ) : (
            <p className="col-span-3 py-12 text-center text-sm text-[#0f4f4b]/40">
              No services available at the moment. Check back soon.
            </p>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 text-center"
        >
          <a href="/booking"
            onClick={() => trackCtaClick({ label: "Book a Consultation", location: "services_section" })}
            className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#0f4f4b] px-8 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0a3a36]"
          >Book a Consultation →</a>
        </motion.div>
      </div>
    </section>
  );
}
