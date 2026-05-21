"use client";

import { useAuth } from "@/contexts/auth-context";
import { NavBar } from "@/modules/home/sections/NavBar";
import { HeroSection } from "@/modules/home/sections/HeroSection";
import { FounderStory } from "@/modules/home/sections/FounderStory";
import { ProblemSection } from "@/modules/home/sections/ProblemSection";
import { HowItWorks } from "@/modules/home/sections/HowItWorks";
import { ServicesSection } from "@/modules/home/sections/ServicesSection";
import { GenerationsSection } from "@/modules/home/sections/GenerationsSection";
import { WhyEyeAura } from "@/modules/home/sections/WhyEyeAura";
import { TechnologySection } from "@/modules/home/sections/TechnologySection";
import { TestimonialsSection } from "@/modules/home/sections/TestimonialsSection";
import { FinalCTA } from "@/modules/home/sections/FinalCTA";
import { FooterSection } from "@/modules/home/sections/FooterSection";

export function LandingPage() {
  const { user } = useAuth();

  return (
    <main className="overflow-x-hidden bg-[#f7f3ee]">
      <NavBar user={user} />
      <HeroSection user={user} />
      <FounderStory />
      <ProblemSection />
      <HowItWorks />
      <ServicesSection />
      <GenerationsSection />
      <WhyEyeAura />
      <TechnologySection />
      <TestimonialsSection />
      <FinalCTA user={user} />
      <FooterSection />
    </main>
  );
}
