import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicRoutes = ["/auth/login", "/auth/signup", "/", "/invite"];
const patientRoutes = ["/patient"];
const bookingRoutes = ["/booking"];
const doctorRoutes = ["/doctor"];
const adminRoutes = ["/admin"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("firebaseAuthToken")?.value;

  // Check if the route is public
  const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname.startsWith(route));

  // If trying to access protected route without token, redirect to login
  if (!token && !isPublicRoute) {
    const loginUrl = new URL("/auth/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // If trying to access login/signup with token, redirect to appropriate dashboard
  if (token && (pathname === "/auth/login" || pathname === "/auth/signup")) {
    // For now, redirect to patient dashboard - in production, check user role
    const dashboardUrl = new URL("/patient/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // Role-based redirects (simplified - in production, decode token and check role)
  if (token) {
    if (patientRoutes.some((route) => pathname.startsWith(route))) {
      // Patient routes - allow access
      return NextResponse.next();
    }
    
    if (doctorRoutes.some((route) => pathname.startsWith(route))) {
      // Doctor routes - allow access
      return NextResponse.next();
    }
    
    if (adminRoutes.some((route) => pathname.startsWith(route))) {
      // Admin routes - allow access
      return NextResponse.next();
    }
    
    if (bookingRoutes.some((route) => pathname.startsWith(route))) {
      // Booking routes - allow access
      return NextResponse.next();
    }
    
    // If trying to access auth pages while authenticated, redirect to dashboard
    if (pathname === "/auth/login" || pathname === "/auth/signup") {
      return NextResponse.redirect(new URL("/patient/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*$).*)",
  ],
};
