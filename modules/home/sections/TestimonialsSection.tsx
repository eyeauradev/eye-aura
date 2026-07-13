"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { testimonialsService } from "@/services/firestore";
import type { TestimonialDocument } from "@/types/firestore";

function Stars({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5">
      {Array(n)
        .fill(0)
        .map((_, i) => (
          <Star key={i} className="h-3.5 w-3.5 fill-[#b5964d] text-[#b5964d]" />
        ))}
    </div>
  );
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function TestimonialCard({ t }: { t: TestimonialDocument }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: 0 }}
      className="flex flex-col rounded-3xl border border-[#0f4f4b]/8 bg-white p-7"
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          {t.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={t.imageUrl}
              alt={t.name}
              className="h-10 w-10 rounded-full bg-[#0f4f4b]/10 object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0f4f4b]/10 text-sm font-bold text-[#0f4f4b]">
              {getInitials(t.name)}
            </div>
          )}
          <div>
            <p className="text-sm font-bold text-[#0f4f4b]">{t.name}</p>
            <p className="text-xs text-[#0f4f4b]/45">{t.designation}</p>
          </div>
        </div>
        <Stars n={t.rating} />
      </div>

      <p className="flex-1 text-sm leading-relaxed text-[#0f4f4b]/65">
        &ldquo;{t.testimonial}&rdquo;
      </p>

      {t.tag && (
        <div className="mt-5">
          <span className="rounded-full bg-[#0f4f4b]/8 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#0f4f4b]/60">
            {t.tag}
          </span>
        </div>
      )}
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <section className="bg-[#f7f3ee] py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-16 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-[#0f4f4b]/45">
            Patient Stories
          </p>
          <h2 className="mb-4 text-4xl font-black text-[#0f4f4b] lg:text-5xl">
            Real People.
            <br />
            Real Results.
          </h2>
          <div className="mx-auto h-5 w-64 animate-pulse rounded-full bg-[#0f4f4b]/10" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col gap-4 rounded-3xl border border-[#0f4f4b]/8 bg-white p-7"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 animate-pulse rounded-full bg-[#0f4f4b]/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 animate-pulse rounded-full bg-[#0f4f4b]/10" />
                  <div className="h-2.5 w-16 animate-pulse rounded-full bg-[#0f4f4b]/10" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full animate-pulse rounded-full bg-[#0f4f4b]/10" />
                <div className="h-3 w-5/6 animate-pulse rounded-full bg-[#0f4f4b]/10" />
                <div className="h-3 w-2/3 animate-pulse rounded-full bg-[#0f4f4b]/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TestimonialsSection() {
  const [loading, setLoading] = useState(true);
  const [testimonials, setTestimonials] = useState<TestimonialDocument[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await testimonialsService.getActive();
        if (!cancelled) setTestimonials(data);
      } catch (error) {
        // Log the failure but never crash the homepage. The section simply
        // stays hidden when testimonials can't be loaded.
        console.error("[TestimonialsSection] Failed to load testimonials:", error);
        if (!cancelled) setTestimonials([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <LoadingSkeleton />;
  }

  // Gracefully hide the section when there are no active testimonials (or on error).
  if (testimonials.length === 0) {
    return null;
  }

  return (
    <section className="bg-[#f7f3ee] py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mb-16 text-center"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-[#0f4f4b]/45">
            Patient Stories
          </p>
          <h2 className="mb-4 text-4xl font-black text-[#0f4f4b] lg:text-5xl">
            Real People.
            <br />
            Real Results.
          </h2>
          <p className="mx-auto max-w-xl text-lg text-[#0f4f4b]/55">
            Thousands of patients across India have experienced better vision care at home.
          </p>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => (
            <TestimonialCard key={t.id} t={t} />
          ))}
        </div>
      </div>
    </section>
  );
}
