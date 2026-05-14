"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Leaf,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionContainer } from "@/components/section-container";
import {
  heroCards,
  navItems,
  services,
  steps,
  symptoms,
  testimonials,
} from "@/modules/home/content";
import { AnimatedSection } from "@/modules/home/animated-section";
import { cn } from "@/lib/utils";

const doctorImage =
  "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=1100&q=85";
const lifestyleImage =
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=85";

export function LandingPage() {
  const { user } = useAuth();

  return (
    <main className="overflow-hidden">
      <Header user={user} />
      <Hero user={user} />
      <LifestyleSection />
      <ScreeningSection />
      <ServicesSection user={user} />
      <HowItWorksSection />
      <PhilosophySection />
      <TestimonialsSection />
      <FinalCta user={user} />
      <Footer />
    </main>
  );
}

function Header({ user }: { user: any }) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 py-4 sm:px-6">
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/60 bg-[#fffaf3]/78 px-4 py-3 shadow-[0_16px_48px_rgba(15,79,75,0.08)] backdrop-blur-xl"
        aria-label="Main navigation"
      >
        <Link href="#" className="flex items-center gap-3 rounded-full pr-3">
          <Image
            src="/eye-aura-logo.png"
            alt="Eye Aura"
            width={56}
            height={56}
            className="h-11 w-11 rounded-full object-cover"
            priority
          />
          <span className="hidden text-sm font-bold uppercase tracking-[0.22em] text-primary sm:inline">
            Eye Aura
          </span>
        </Link>
        <div className="hidden items-center gap-7 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-bold text-primary/75 transition hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
        </div>
        <Button asChild size="default" className="min-h-11 px-5">
          <Link href={user ? "/booking" : "#care"}>
            {user ? "Book Now" : "Start Consultation"}
          </Link>
        </Button>
      </nav>
    </header>
  );
}

function Hero({ user }: { user: any }) {
  return (
    <section className="relative min-h-screen px-5 pb-16 pt-32 sm:px-8 lg:pt-40">
      <div className="absolute left-[-10rem] top-20 h-80 w-80 rounded-full bg-accent/45 blur-3xl" />
      <div className="absolute right-[-8rem] top-32 h-96 w-96 rounded-full bg-secondary/20 blur-3xl" />
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1fr_0.9fr]">
        <AnimatedSection className="relative z-10">
          <Badge>Vision. Care. Anywhere.</Badge>
          <h1 className="mt-7 max-w-4xl font-display text-5xl leading-[1.04] text-primary sm:text-6xl lg:text-7xl">
            Eye care designed for modern living.
          </h1>
          <p className="mt-7 max-w-2xl text-xl leading-9 text-muted-foreground">
            Your eyes are overworked. Eye Aura brings calm, premium, accessible
            digital wellness to screen-heavy lives, with guidance that feels
            personal instead of clinical.
          </p>
          <div className="mt-9 flex flex-col gap-4 sm:flex-row">
            <Button asChild size="lg">
              <Link href={user ? "/booking" : "#care"}>
                {user ? "Book Now" : "Start Consultation"} <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="#lifestyle">Explore Eye Care</Link>
            </Button>
          </div>
          <div className="mt-10 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
            {["Readable", "Calm", "Online", "Personal"].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-primary/10 bg-white/45 px-4 py-3 text-center text-sm font-bold text-primary"
              >
                {item}
              </div>
            ))}
          </div>
        </AnimatedSection>
        <AnimatedSection className="relative min-h-[560px]">
          <div className="relative mx-auto h-[560px] max-w-[520px] overflow-hidden rounded-[2.5rem] bg-primary/10 p-4 shadow-[0_34px_90px_rgba(15,79,75,0.18)]">
            <div className="absolute inset-0 aura-gradient opacity-10" />
            <Image
              src={doctorImage}
              alt="Calm eye care doctor consultation portrait"
              fill
              sizes="(min-width: 1024px) 520px, 100vw"
              className="object-cover object-center"
              priority
            />
            <div className="absolute inset-x-6 bottom-6 rounded-3xl border border-white/50 bg-[#fffaf3]/76 p-5 backdrop-blur-xl">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-secondary">
                Digital Eye Wellness
              </p>
              <p className="mt-2 text-2xl font-bold text-primary">
                A calmer path to clarity.
              </p>
            </div>
          </div>
          <div className="absolute right-0 top-24 z-20 grid gap-4 sm:right-4">
            {heroCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={card.label}
                  animate={{ y: [0, index % 2 === 0 ? -8 : 8, 0] }}
                  transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: index * 0.2,
                  }}
                  className="glass-panel flex items-center gap-3 rounded-2xl bg-white/70 px-5 py-4 shadow-lg backdrop-blur-xl"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-secondary/15 text-secondary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-bold text-primary">{card.label}</span>
                </motion.div>
              );
            })}
          </div>
        </AnimatedSection>
      </div>
      <Link
        href="#lifestyle"
        aria-label="Scroll to lifestyle concerns"
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 rounded-full border border-primary/15 bg-white/50 p-3 text-primary backdrop-blur transition hover:bg-white md:block"
      >
        <ChevronDown className="h-5 w-5" />
      </Link>
    </section>
  );
}

function LifestyleSection() {
  return (
    <SectionContainer
      id="lifestyle"
      eyebrow="Digital lifestyle"
      title="For the screen generation and the eyes carrying it."
      intro="Eye Aura meets the quiet discomforts people normalize every day: tired focus, dryness, light sensitivity, and the subtle pressure of always being online."
    >
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-5">
        {symptoms.map((symptom, index) => {
          const Icon = symptom.icon;
          return (
            <AnimatedSection key={symptom.title} transition={{ delay: index * 0.06 }}>
              <Card className="group h-full transition duration-300 hover:-translate-y-2 hover:border-secondary/30 hover:shadow-[0_30px_90px_rgba(181,150,77,0.18)]">
                <span className="mb-8 grid h-14 w-14 place-items-center rounded-2xl bg-primary/8 text-primary transition group-hover:bg-secondary/15 group-hover:text-secondary">
                  <Icon className="h-6 w-6" />
                </span>
                <CardTitle>{symptom.title}</CardTitle>
                <CardContent className="mt-3 text-base leading-7">
                  {symptom.text}
                </CardContent>
              </Card>
            </AnimatedSection>
          );
        })}
      </div>
    </SectionContainer>
  );
}

function ScreeningSection() {
  return (
    <SectionContainer id="screening" className="bg-[#EAE2D6]/45">
      <div className="grid items-center gap-12 lg:grid-cols-[0.92fr_1fr]">
        <AnimatedSection>
          <div className="relative min-h-[520px] overflow-hidden rounded-[2rem] bg-primary p-6 text-white soft-shadow">
            <Image
              src={lifestyleImage}
              alt="Person using laptop in a calm wellness workspace"
              fill
              sizes="(min-width: 1024px) 560px, 100vw"
              className="object-cover opacity-28"
            />
            <div className="relative z-10 flex h-full min-h-[472px] flex-col justify-between rounded-[1.5rem] border border-white/20 bg-white/10 p-6 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <Badge className="border-white/20 bg-white/15 text-white">
                  Self Screening
                </Badge>
                <span className="grid h-12 w-12 place-items-center rounded-full bg-white/15">
                  <Sparkles className="h-5 w-5" />
                </span>
              </div>
              <div className="mx-auto grid aspect-square w-64 place-items-center rounded-full border border-white/20 bg-white/10">
                <div className="grid h-40 w-40 place-items-center rounded-full border border-secondary/70">
                  <div className="h-20 w-20 rounded-full bg-secondary shadow-[0_0_55px_rgba(181,150,77,0.5)]" />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {["Cover one eye", "Follow guided prompts", "Save care notes"].map(
                  (item) => (
                    <div key={item} className="rounded-2xl bg-white/12 p-4 text-sm font-bold">
                      {item}
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </AnimatedSection>
        <AnimatedSection>
          <Badge>Feature preview</Badge>
          <h2 className="mt-5 font-display text-4xl leading-tight text-primary sm:text-5xl">
            Premium visual acuity self-screening, designed for home.
          </h2>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            Phase 2 introduces the experience concept: a guided, one-eye-at-a-time
            flow that feels calm, readable, and supportive. Full diagnostic logic
            will be built in a later module.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              "One-eye testing flow",
              "Distance and lighting guidance",
              "Readable accessibility-first prompts",
              "Home-based screening concept",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/55 p-4">
                <Check className="h-5 w-5 text-secondary" />
                <span className="font-bold text-primary">{item}</span>
              </div>
            ))}
          </div>
          <Button asChild size="lg" className="mt-9">
            <Link href="#care">
              Start Self Screening <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </AnimatedSection>
      </div>
    </SectionContainer>
  );
}

function ServicesSection({ user }: { user: any }) {
  return (
    <SectionContainer
      id="care"
      eyebrow="Care services"
      title="Digital eye care without the hospital feeling."
      intro="Premium service cards for the public website, ready to connect to booking and payment flows in later phases."
    >
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service, index) => {
          const Icon = service.icon;
          return (
            <AnimatedSection key={service.title}>
              <Card className="flex h-full flex-col p-7 transition hover:-translate-y-1 hover:shadow-lg">
                <div className="flex flex-col flex-grow">
                  <span className="mb-7 grid h-14 w-14 place-items-center rounded-2xl bg-accent/35 text-primary shrink-0">
                    <Icon className="h-6 w-6" />
                  </span>
                  <CardHeader className="p-0 pb-4">
                    <CardTitle className="font-display text-2xl">{service.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow space-y-5 p-0 text-base leading-7">
                    <p>{service.description}</p>
                    <p>
                      <span className="font-bold text-primary">Suitable for: </span>
                      {service.suitableFor}
                    </p>
                  </CardContent>
                </div>
                <div className="mt-8 flex items-center justify-between gap-4 pt-6 border-t border-primary/10">
                  <span className="font-display text-2xl text-secondary">{service.price}</span>
                  <Button variant="outline" asChild>
                    <Link href={user ? "/booking" : "/auth/login"}>Book</Link>
                  </Button>
                </div>
              </Card>
            </AnimatedSection>
          );
        })}
      </div>
    </SectionContainer>
  );
}

function HowItWorksSection() {
  return (
    <SectionContainer
      eyebrow="How it works"
      title="A gentle path from concern to clarity."
    >
      <div className="grid gap-4 md:grid-cols-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <AnimatedSection key={step.title} className="relative">
              <Card className="h-full p-6">
                <span className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white">
                  <Icon className="h-6 w-6" />
                </span>
                <p className="text-sm font-bold text-secondary">Step 0{index + 1}</p>
                <CardTitle className="mt-2">{step.title}</CardTitle>
                <CardContent className="mt-3 leading-7">{step.text}</CardContent>
              </Card>
              {index < steps.length - 1 ? (
                <div className="absolute -right-2 top-1/2 hidden h-px w-4 bg-secondary/40 md:block" />
              ) : null}
            </AnimatedSection>
          );
        })}
      </div>
    </SectionContainer>
  );
}

function PhilosophySection() {
  return (
    <SectionContainer id="philosophy" className="bg-primary/5">
      <AnimatedSection className="relative mx-auto max-w-5xl text-center">
        <Leaf className="mx-auto mb-8 h-10 w-10 text-secondary" />
        <blockquote className="font-display text-4xl leading-tight text-primary sm:text-6xl">
          &quot;Vision care should not feel rushed.
          <br />
          It should feel understood.&quot;
        </blockquote>
        <p className="mx-auto mt-8 max-w-2xl text-lg leading-8 text-muted-foreground">
          Eye Aura is built for slower explanations, kinder interfaces, and care
          rituals that respect the way modern eyes actually live.
        </p>
      </AnimatedSection>
    </SectionContainer>
  );
}

function TestimonialsSection() {
  return (
    <SectionContainer
      eyebrow="Trust"
      title="Care that feels personal, even online."
      intro="Early testimonial copy for a calm premium trust section. These can later be replaced with verified reviews."
    >
      <div className="grid gap-5 md:grid-cols-3">
        {testimonials.map((testimonial) => (
          <AnimatedSection key={testimonial.name}>
            <Card className="h-full p-7">
              <div className="mb-7 flex gap-1 text-secondary">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Sparkles key={index} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="text-lg leading-8 text-primary">
                &quot;{testimonial.quote}&quot;
              </p>
              <div className="mt-8 border-t border-primary/10 pt-5">
                <p className="font-bold text-primary">{testimonial.name}</p>
                <p className="text-sm text-muted-foreground">{testimonial.role}</p>
              </div>
            </Card>
          </AnimatedSection>
        ))}
      </div>
    </SectionContainer>
  );
}

function FinalCta({ user }: { user: any }) {
  return (
    <section id="final" className="px-5 py-20 sm:px-8">
      <AnimatedSection className="mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-primary px-6 py-16 text-center text-white shadow-[0_34px_100px_rgba(15,79,75,0.2)] sm:px-12">
        <Image
          src="/eye-aura-logo.png"
          alt=""
          width={112}
          height={112}
          className="mx-auto mb-8 h-24 w-24 rounded-full object-cover opacity-95"
        />
        <h2 className="mx-auto max-w-4xl font-display text-4xl leading-tight sm:text-6xl">
          Your eyes support your everyday life. Give them the care they deserve.
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/78">
          Begin with a calm consultation and leave with guidance shaped around
          your screens, routines, and comfort.
        </p>
        <Button asChild size="lg" variant="secondary" className="mt-9">
          <Link href={user ? "/booking" : "/auth/login"}>
            {user ? "Book Now" : "Begin Consultation"} <ArrowRight className="h-5 w-5" />
          </Link>
        </Button>
      </AnimatedSection>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-primary/10 px-5 py-12 sm:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
        <div>
          <Image
            src="/eye-aura-logo.png"
            alt="Eye Aura"
            width={92}
            height={92}
            className="h-20 w-20 rounded-full object-cover"
          />
          <p className="mt-5 max-w-sm text-sm leading-7 text-muted-foreground">
            Premium digital eye wellness for modern living. Calm, accessible,
            and emotionally intelligent care.
          </p>
        </div>
        <FooterColumn
          title="Quick links"
          links={[
            ["Lifestyle", "#lifestyle"],
            ["Screening", "#screening"],
            ["Care", "#care"],
            ["Philosophy", "#philosophy"],
          ]}
        />
        <FooterColumn
          title="Contact"
          links={[
            ["hello@eyeaura.com", "mailto:hello@eyeaura.com"],
            ["WhatsApp placeholder", "#"],
            ["Instagram", "#"],
            ["LinkedIn", "#"],
          ]}
        />
        <FooterColumn
          title="Policies"
          links={[
            ["Privacy Policy", "#"],
            ["Terms of Care", "#"],
            ["Accessibility", "#"],
            ["Refund Policy", "#"],
          ]}
        />
      </div>
      <div className="mx-auto mt-10 max-w-7xl text-sm text-muted-foreground">
        Copyright 2026 Eye Aura. All rights reserved.
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: [string, string][];
}) {
  return (
    <div>
      <h2 className="text-sm font-bold uppercase tracking-[0.22em] text-primary">
        {title}
      </h2>
      <ul className="mt-5 space-y-3">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link
              href={href}
              className="text-sm text-muted-foreground transition hover:text-primary"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
