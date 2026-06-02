"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  Home,
  Calendar,
  FileText,
  User,
  Eye,
  RefreshCw,
  Globe,
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
  { href: "/patient/prescriptions", label: "Prescriptions", icon: FileText, group: "main" },
  { href: "/patient/profile", label: "My Account", icon: User, group: "account" },
  { href: "/", label: "Public Home", icon: Globe, group: "external" },
];

const mobileNavItems = [
  { href: "/patient/dashboard", label: "Dashboard", icon: Home },
  { href: "/patient/appointments", label: "Appointments", icon: Calendar },
  { href: "/patient/assessment", label: "Assessments", icon: Eye, isCenter: true },
  { href: "/patient/prescriptions", label: "Prescriptions", icon: FileText },
  { href: "/patient/profile", label: "My Account", icon: User },
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

  useEffect(() => {
    if (!loading && user && !user.emailVerified) {
      router.push("/auth/verify-email");
    }
  }, [user, loading, router]);

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
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              const isCenter = item.isCenter;

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
