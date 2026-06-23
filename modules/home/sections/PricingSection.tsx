"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { trackCtaClick } from "@/services/analytics/analytics.service";

const plans = [
  {
    name: "Basic Vision Check",
    price: "₹299",
    period: "per session",
    desc: "Perfect for a quick prescription update or routine check.",
    features: [
      "Distance & Near Vision Assessment",
      "Digital Prescription (PDF)",
      "30-minute session",
      "WhatsApp delivery",
    ],
    cta: "Book Basic",
    featured: false,
    highlight: "",
  },
  {
    name: "Complete Eye Care",
    price: "₹599",
    period: "per session",
    desc: "Our most comprehensive consultation — the full optometry experience, digitally.",
    features: [
      "Full Refraction Assessment",
      "Certified Digital Prescription",
      "Eye Health Screening",
      "45-minute session",
      "Personalised Wellness Report",
      "Follow-up WhatsApp support",
    ],
    cta: "Book Complete",
    featured: true,
    highlight: "Most Popular",
  },
  {
    name: "Family Pack",
    price: "₹1,499",
    period: "up to 4 members",
    desc: "One booking. Your whole family covered. Best value for households.",
    features: [
      "4 Individual Consultations",
      "Individual Prescriptions for each",
      "Family Eye Health Summary",
      "Flexible scheduling",
      "Priority booking",
    ],
    cta: "Book Family Pack",
    featured: false,
    highlight: "",
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="bg-white py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mb-16 text-center"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-[#0f4f4b]/45">Transparent Pricing</p>
          <h2 className="mb-4 text-4xl font-black text-[#0f4f4b] lg:text-5xl">Simple. Honest. Affordable.</h2>
          <p className="mx-auto max-w-xl text-lg text-[#0f4f4b]/55">
            No hidden fees. No clinic markups. Just quality eye care at a fair price.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 36 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.65, delay: i * 0.12 }}
              className={`relative flex flex-col rounded-3xl p-8 ${
                plan.featured
                  ? "bg-[#0f4f4b] shadow-[0_24px_80px_rgba(15,79,75,0.35)]"
                  : "border border-[#0f4f4b]/10 bg-[#f7f3ee]"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-[#b5964d] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-md">
                    {plan.highlight}
                  </span>
                </div>
              )}

              <div className="mb-6">
                <p className={`mb-1 text-xs font-semibold uppercase tracking-widest ${plan.featured ? "text-white/50" : "text-[#0f4f4b]/45"}`}>
                  {plan.name}
                </p>
                <div className="flex items-baseline gap-2">
                  <span className={`text-5xl font-black ${plan.featured ? "text-white" : "text-[#0f4f4b]"}`}>{plan.price}</span>
                  <span className={`text-sm ${plan.featured ? "text-white/50" : "text-[#0f4f4b]/45"}`}>{plan.period}</span>
                </div>
                <p className={`mt-2 text-sm leading-relaxed ${plan.featured ? "text-white/65" : "text-[#0f4f4b]/55"}`}>{plan.desc}</p>
              </div>

              <ul className="mb-8 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${plan.featured ? "bg-white/20" : "bg-[#0f4f4b]/10"}`}>
                      <Check className={`h-2.5 w-2.5 ${plan.featured ? "text-white" : "text-[#0f4f4b]"}`} />
                    </span>
                    <span className={`text-sm ${plan.featured ? "text-white/75" : "text-[#0f4f4b]/65"}`}>{f}</span>
                  </li>
                ))}
              </ul>

              <a href="/booking"
                onClick={() => trackCtaClick({ label: plan.cta, location: "pricing_section" })}
                className={`flex h-12 items-center justify-center rounded-2xl text-sm font-semibold transition ${
                  plan.featured
                    ? "bg-white text-[#0f4f4b] hover:bg-white/90"
                    : "bg-[#0f4f4b] text-white hover:bg-[#0a3a36]"
                }`}
              >{plan.cta}</a>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-8 text-center text-sm text-[#0f4f4b]/40"
        >
          All consultations include a certified digital prescription. Payment collected securely online before session.
        </motion.p>
      </div>
    </section>
  );
}
