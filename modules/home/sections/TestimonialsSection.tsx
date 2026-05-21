"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Priya Sharma",
    location: "Bhopal, MP",
    avatar: "PS",
    rating: 5,
    quote: "I was sceptical about an online eye check-up, but the experience was completely professional. Got my prescription in 30 minutes and used it the very next day at a local optician.",
    tag: "Prescription Renewal",
  },
  {
    name: "Rohan Mehta",
    location: "Pune, Maharashtra",
    avatar: "RM",
    rating: 5,
    quote: "The optometrist was incredibly patient and thorough. She caught my astigmatism that three previous doctors had missed. I'm blown away by how much better I can see now.",
    tag: "Full Eye Exam",
  },
  {
    name: "Anjali Nair",
    location: "Thiruvananthapuram, Kerala",
    avatar: "AN",
    rating: 5,
    quote: "As someone who works from home with a toddler, finding time for a clinic visit is impossible. Eye Aura was a blessing: morning slot, 40-minute session, prescription by 11 AM.",
    tag: "Working Professional",
    featured: true,
  },
  {
    name: "Vikram Singh",
    location: "Jaipur, Rajasthan",
    avatar: "VS",
    rating: 5,
    quote: "My 65-year-old mother was nervous about technology. The team walked her through every step. She said it was easier than going to the local optician and far more detailed.",
    tag: "Senior Citizen Care",
  },
  {
    name: "Kavya Reddy",
    location: "Hyderabad, Telangana",
    avatar: "KR",
    rating: 5,
    quote: "Saved me 3 hours of travel and a half-day of leave. The digital prescription worked perfectly at Lenskart. 10/10 would recommend to every WFH professional.",
    tag: "Digital First",
  },
  {
    name: "Arjun Patel",
    location: "Ahmedabad, Gujarat",
    avatar: "AP",
    rating: 5,
    quote: "Booked for my whole family: me, my wife, and two kids. All four consultations done in one afternoon from our living room. The family pack is excellent value.",
    tag: "Family Pack",
  },
];

function Stars({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5">
      {Array(n).fill(0).map((_, i) => (
        <Star key={i} className="h-3.5 w-3.5 fill-[#b5964d] text-[#b5964d]" />
      ))}
    </div>
  );
}

export function TestimonialsSection() {
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
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-[#0f4f4b]/45">Patient Stories</p>
          <h2 className="mb-4 text-4xl font-black text-[#0f4f4b] lg:text-5xl">Real People.<br />Real Results.</h2>
          <p className="mx-auto max-w-xl text-lg text-[#0f4f4b]/55">
            Thousands of patients across India have experienced better vision care at home.
          </p>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.08 }}
              className={`flex flex-col rounded-3xl p-7 ${t.featured ? "border-2 border-[#0f4f4b]/20 bg-[#0f4f4b] text-white" : "border border-[#0f4f4b]/8 bg-white"}`}
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${t.featured ? "bg-white/20 text-white" : "bg-[#0f4f4b]/10 text-[#0f4f4b]"}`}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${t.featured ? "text-white" : "text-[#0f4f4b]"}`}>{t.name}</p>
                    <p className={`text-xs ${t.featured ? "text-white/60" : "text-[#0f4f4b]/45"}`}>{t.location}</p>
                  </div>
                </div>
                <Stars n={t.rating} />
              </div>

              <p className={`flex-1 text-sm leading-relaxed ${t.featured ? "text-white/80" : "text-[#0f4f4b]/65"}`}>
                "{t.quote}"
              </p>

              <div className="mt-5">
                <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${t.featured ? "bg-white/15 text-white/80" : "bg-[#0f4f4b]/8 text-[#0f4f4b]/60"}`}>
                  {t.tag}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
