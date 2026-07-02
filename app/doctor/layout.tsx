"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  LayoutDashboard,
  Calendar,
  Bell,
  Users,
  FileText,
  Clock,
  UserCircle,
  RefreshCw,
  Home,
  MoreHorizontal,
  Globe,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FloatingSidebar, PageTransition } from "@/components/premium";
import type { NavItem } from "@/components/premium";
import { GLASS, SPACING, RADIUS } from "@/lib/design-tokens";
import { usePendingRequestsCount } from "@/hooks/usePendingRequestsCount";

/**
 * Checks if the current pathname matches a nav item href using prefix matching.
 */
function isActiveRoute(currentHref: string, itemHref: string): boolean {
  if (currentHref === itemHref) return true;
  if (
    currentHref.startsWith(itemHref) &&
    (currentHref[itemHref.length] === "/" || currentHref[itemHref.length] === "?")
  ) {
    return true;
  }
  return false;
}

/**
 * Checks if the current route is a consultation page.
 * Consultation pages hide the main sidebar for a distraction-free experience.
 */
function isConsultationRoute(pathname: string): boolean {
  return pathname.startsWith("/doctor/consultations/");
}

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  
  // Get real-time pending requests count
  const { count: pendingCount } = usePendingRequestsCount(user?.id ?? null);

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

  useEffect(() => {
    if (!loading && user && !user.emailVerified) {
      router.push("/auth/verify-email");
    }
  }, [user, loading, router]);

  /**
   * Doctor module navigation items.
   * Groups: "main" for primary navigation, "account" for profile/settings.
   */
  const doctorNavItems: NavItem[] = [
    { label: "Public Home", href: "/", icon: Home, group: "home" },
    { label: "Dashboard", href: "/doctor/dashboard", icon: LayoutDashboard, group: "main" },
    { label: "Appointments", href: "/doctor/appointments", icon: Calendar, group: "main" },
    { label: "Requests", href: "/doctor/requests", icon: Bell, group: "main", badge: pendingCount },
    { label: "Patients", href: "/doctor/patients", icon: Users, group: "main" },
    { label: "Prescriptions", href: "/doctor/prescriptions", icon: FileText, group: "main" },
    { label: "Recommendations", href: "/doctor/recommendations", icon: Globe, group: "main" },
    { label: "Slots", href: "/doctor/slots", icon: Clock, group: "main" },
    { label: "Profile", href: "/doctor/profile", icon: UserCircle, group: "account" },
  ];

  /** Subset of nav items shown in the mobile bottom navigation bar */
  const mobileNavItems: NavItem[] = [
    { label: "Dashboard", href: "/doctor/dashboard", icon: LayoutDashboard },
    { label: "Appointments", href: "/doctor/appointments", icon: Calendar },
    { label: "Requests", href: "/doctor/requests", icon: Bell, badge: pendingCount },
    { label: "Patients", href: "/doctor/patients", icon: Users },
    { label: "More", href: "__more__", icon: MoreHorizontal },
  ];

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

  const inConsultation = isConsultationRoute(pathname);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background layer: subtle radial gradient glows using accent/secondary at ≤10% opacity */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden="true"
      >
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-accent/[0.07] blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/[0.05] blur-[100px]" />
      </div>

      {/* Glass Header — sticky */}
      <header
        className={cn(
          "sticky top-0 z-40",
          GLASS.headerBackground,
          GLASS.blur,
          GLASS.border
        )}
      >
        <div
          className={cn(
            "mx-auto max-w-7xl",
            SPACING.pageX,
            "py-3 sm:py-4",
            RADIUS.container
          )}
        >
          <div className="flex items-center justify-between">
            <Link href="/doctor/dashboard" className="flex items-center gap-2">
              <div className="rounded-full bg-[#f7f3ee] p-1">
                <Image
                  src="/eye.png"
                  alt="Eye Aura"
                  width={40}
                  height={40}
                  className="h-10 w-10 object-contain"
                  priority
                />
              </div>
              <span className="font-display text-xl text-primary hidden sm:block">
                Eye Aura
              </span>
            </Link>

            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground hidden sm:block">
                {user?.displayName || "Doctor"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Layout body: sidebar + main content */}
      <div className={cn("flex", SPACING.layoutGap, SPACING.pageX, SPACING.pageY)}>
        {/* FloatingSidebar — hidden on mobile (<1024px) and during consultations */}
        {!inConsultation && (
          <FloatingSidebar
            items={doctorNavItems}
            activeHref={pathname}
            ariaLabel="Doctor module navigation"
          />
        )}

        {/* Main content area — full width during consultations */}
        <main className={cn("flex-1 min-w-0", !inConsultation && "pb-20 lg:pb-0")}>
          <PageTransition>{children}</PageTransition>
        </main>
      </div>

      {/* Mobile bottom navigation bar — visible only on <1024px, hidden during consultations */}
      {!inConsultation && (
        <nav
          className={cn(
            "fixed bottom-0 left-0 right-0 z-40 lg:hidden",
            GLASS.headerBackground,
            GLASS.blur,
            GLASS.border,
            "border-t border-border/50"
          )}
          aria-label="Mobile navigation"
        >
          <div className="flex items-center justify-around px-2 py-2">
            {mobileNavItems.map((item) => {
              const Icon = item.icon;
              const isMore = item.href === "__more__";
              const isActive = !isMore && isActiveRoute(pathname, item.href);

              if (isMore) {
                return (
                  <div key="more" className="relative flex flex-col items-center" ref={moreMenuRef}>
                    {moreMenuOpen && (
                      <div className="absolute bottom-full mb-2 right-0 w-48 bg-card border border-border/40 rounded-2xl shadow-xl backdrop-blur-xl overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200">
                        <Link
                          href="/doctor/prescriptions"
                          onClick={() => setMoreMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-primary/5 transition-colors"
                        >
                          <FileText className="h-4 w-4 text-primary" />
                          Prescriptions
                        </Link>
                        <Link
                          href="/doctor/recommendations"
                          onClick={() => setMoreMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-primary/5 transition-colors"
                        >
                          <Globe className="h-4 w-4 text-primary" />
                          Recommendations
                        </Link>
                        <Link
                          href="/doctor/slots"
                          onClick={() => setMoreMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-primary/5 transition-colors"
                        >
                          <Clock className="h-4 w-4 text-primary" />
                          Slots
                        </Link>
                        <Link
                          href="/"
                          onClick={() => setMoreMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-primary/5 transition-colors"
                        >
                          <Home className="h-4 w-4 text-primary" />
                          Home
                        </Link>
                        <Link
                          href="/doctor/profile"
                          onClick={() => setMoreMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-primary/5 transition-colors"
                        >
                          <UserCircle className="h-4 w-4 text-primary" />
                          Profile
                        </Link>
                      </div>
                    )}
                    <button
                      onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                      className={cn(
                        "flex flex-col items-center gap-0.5 px-3 py-2 min-h-[44px] justify-center",
                        RADIUS.interactive,
                        "transition-colors duration-200",
                        moreMenuOpen ? "text-primary" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {moreMenuOpen ? <X className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                      <span className="text-[10px] font-medium leading-tight text-center">
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
                  className={cn(
                    "relative flex flex-col items-center gap-0.5 px-3 py-2 min-h-[44px] justify-center",
                    RADIUS.interactive,
                    "transition-colors duration-200",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={
                    item.badge !== undefined && item.badge !== null && item.badge > 0
                      ? `${item.label} (${item.badge > 9 ? "9+" : item.badge} pending)`
                      : item.label
                  }
                >
                  <div className="relative">
                    <Icon className="h-5 w-5" />
                    {item.badge !== undefined && item.badge !== null && item.badge > 0 && (
                      <span
                        className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-primary text-white text-[8px] font-bold flex items-center justify-center"
                        aria-hidden="true"
                      >
                        {item.badge > 9 ? "9+" : item.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-medium leading-tight text-center">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
