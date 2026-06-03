"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import {
  Home,
  Calendar,
  FileText,
  User,
  Eye,
  RefreshCw,
  Globe,
  MessageCircle,
  MoreHorizontal,
  X,
  Stethoscope,
} from "lucide-react";
import {
  FloatingSidebar,
  PageTransition,
  PremiumHeader,
} from "@/components/patient-portal";
import { type NavItem } from "@/components/patient-portal/floating-sidebar";
import { type BreadcrumbItem } from "@/components/patient-portal/premium-header";
import { SPACING } from "@/lib/patient-portal/design-tokens";

const sidebarNavItems: NavItem[] = [
  { href: "/patient/dashboard", label: "Dashboard", icon: Home, group: "main" },
  { href: "/patient/appointments", label: "Appointments", icon: Calendar, group: "main" },
  { href: "/patient/assessment", label: "Assessments", icon: Eye, group: "main" },
  { href: "/patient/recommendations", label: "Recommendations", icon: Stethoscope, group: "main" },
  { href: "/patient/prescriptions", label: "Prescriptions", icon: FileText, group: "main" },
  { href: "/patient/profile", label: "My Account", icon: User, group: "account" },
  { href: "/", label: "Public Home", icon: Globe, group: "external" },
];

const mobileNavItems = [
  { href: "/patient/assessment", label: "Assessments", icon: Eye },
  { href: "/patient/appointments", label: "Appointments", icon: Calendar },
  { href: "/patient/dashboard", label: "Dashboard", icon: Home, isCenter: true },
  { href: "/patient/prescriptions", label: "Prescriptions", icon: FileText },
  { href: "__more__", label: "More", icon: MoreHorizontal },
];

/** Derive breadcrumbs from the current pathname */
function getBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const crumbs: BreadcrumbItem[] = [
    { label: "Patient Portal", href: "/patient/dashboard" },
  ];

  if (pathname === "/patient/dashboard") {
    crumbs.push({ label: "Dashboard", href: "/patient/dashboard" });
  } else if (pathname.startsWith("/patient/appointments")) {
    crumbs.push({ label: "Appointments", href: "/patient/appointments" });
  } else if (pathname.startsWith("/patient/assessment")) {
    crumbs.push({ label: "Assessments", href: "/patient/assessment" });
  } else if (pathname.startsWith("/patient/prescriptions")) {
    crumbs.push({ label: "Prescriptions", href: "/patient/prescriptions" });
  } else if (pathname.startsWith("/patient/profile")) {
    crumbs.push({ label: "My Account", href: "/patient/profile" });
  }

  return crumbs;
}

/** Derive page title from the current pathname */
function getPageTitle(pathname: string): string {
  if (pathname === "/patient/dashboard") return "Dashboard";
  if (pathname.startsWith("/patient/appointments")) return "Appointments";
  if (pathname.startsWith("/patient/assessment")) return "Assessments";
  if (pathname.startsWith("/patient/prescriptions")) return "Prescriptions";
  if (pathname.startsWith("/patient/profile")) return "My Account";
  return "Patient Portal";
}

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut, loading } = useAuth();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && user && !user.emailVerified) {
      router.push("/auth/verify-email");
    }
  }, [user, loading, router]);

  // Close more menu on outside click
  useEffect(() => {
    if (!moreMenuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [moreMenuOpen]);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/auth/login";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RefreshCw className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (user && !user.emailVerified) {
    return null;
  }

  const firstName = user?.displayName?.split(" ")[0] || "Patient";
  const breadcrumbs = getBreadcrumbs(pathname);
  const pageTitle = getPageTitle(pathname);

  return (
    <div className="relative min-h-screen bg-background">
      {/* Layered background: radial gradient glows */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden="true"
      >
        {/* Top-left accent glow */}
        <div
          className="absolute -top-32 -left-32 h-[600px] w-[600px] rounded-full opacity-60"
          style={{
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--accent) 15%, transparent) 0%, transparent 70%)",
          }}
        />
        {/* Bottom-right secondary glow */}
        <div
          className="absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full opacity-50"
          style={{
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--secondary) 10%, transparent) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Main layout content */}
      <div className="relative z-10">
        {/* 12-column responsive grid with max-w-7xl centered container */}
        <div className={`mx-auto lg:max-w-7xl ${SPACING.pageX} ${SPACING.pageY}`}>
          {/* Premium Header — inside the same container for alignment */}
          <PremiumHeader
            title={pageTitle}
            subtitle={`Welcome back, ${firstName}`}
            breadcrumbs={breadcrumbs}
            className="mb-6"
          />

          {/* WhatsApp number missing banner */}
          {user && !user.whatsappNumber && (
            <div className="mb-4 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <MessageCircle className="h-4 w-4 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-800 flex-1">
                Add your WhatsApp number in{" "}
                <Link href="/patient/profile" className="font-bold underline underline-offset-2 hover:text-amber-900">
                  Profile
                </Link>{" "}
                for doctor communication
              </p>
            </div>
          )}

          <div className={`flex ${SPACING.layoutGap}`}>
            {/* Floating Sidebar — visible at lg+ */}
            <aside className="w-64 flex-shrink-0 hidden lg:block">
              <FloatingSidebar
                items={sidebarNavItems}
                activeHref={pathname}
              />
            </aside>

            {/* Main Content with page transition */}
            <main className="flex-1 min-w-0 pb-24 lg:pb-0">
              <PageTransition>
                {children}
              </PageTransition>
            </main>
          </div>
        </div>

        {/* Mobile Bottom Navigation — visible below lg */}
        <nav
          className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/85 backdrop-blur-xl border-t border-border/30"
          aria-label="Mobile navigation"
        >
          <div className="flex items-end py-1.5">
            {mobileNavItems.map((item) => {
              const Icon = item.icon;
              const isMore = item.href === "__more__";
              const isActive = !isMore &&
                (pathname === item.href || pathname.startsWith(`${item.href}/`));
              const isCenter = item.isCenter;

              if (isMore) {
                return (
                  <div key="more" className="relative flex-1" ref={moreMenuRef}>
                    {/* Drop-up menu */}
                    {moreMenuOpen && (
                      <div className="absolute bottom-full mb-2 right-0 w-48 bg-card border border-border/40 rounded-2xl shadow-xl backdrop-blur-xl overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200">
                        <Link
                          href="/"
                          onClick={() => setMoreMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-primary/5 transition-colors"
                        >
                          <Globe className="h-4 w-4 text-primary" />
                          Home
                        </Link>
                        <Link
                          href="/patient/profile"
                          onClick={() => setMoreMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-primary/5 transition-colors"
                        >
                          <User className="h-4 w-4 text-primary" />
                          My Account
                        </Link>
                      </div>
                    )}
                    <button
                      onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                      className={`w-full flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-xl transition-colors duration-200 ${
                        moreMenuOpen ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {moreMenuOpen ? <X className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                      <span className="text-[9px] font-medium leading-tight text-center">
                        {moreMenuOpen ? "Close" : item.label}
                      </span>
                    </button>
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex-1 flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-xl transition-colors duration-200 ${
                    isCenter
                      ? "bg-primary text-primary-foreground -mt-5 mx-1 shadow-[0_4px_16px_rgba(15,79,75,0.35)] pb-2 rounded-2xl"
                      : isActive
                        ? "text-primary"
                        : "text-muted-foreground"
                  }`}
                >
                  <Icon className={`${isCenter ? "h-6 w-6" : "h-5 w-5"}`} />
                  <span className="text-[9px] font-medium leading-tight text-center">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
