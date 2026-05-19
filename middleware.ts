import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicRoutes = ["/auth/login", "/auth/signup", "/", "/invite"];
const patientRoutes = ["/patient"];
const bookingRoutes = ["/booking"];
const doctorRoutes = ["/doctor"];
const adminRoutes = ["/admin"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("__session")?.value;

  // Check if the route is public
  const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname.startsWith(route));

  // If trying to access protected route without token, redirect to login
  if (!token && !isPublicRoute) {
    const loginUrl = new URL("/auth/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // If trying to access login/signup with token, redirect based on role
  // Role-based redirect happens in the page component (server-side)
  // Middleware just redirects to a generic dashboard, page component handles role-specific redirect
  if (token && (pathname === "/auth/login" || pathname === "/auth/signup")) {
    // Redirect to patient dashboard as default, page component will handle role-specific redirect
    const dashboardUrl = new URL("/patient/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // Role-based route protection
  // If user is on a protected route, let the page component handle role validation
  // Middleware only ensures authentication, not authorization
  // This avoids Firebase Admin SDK calls in edge runtime

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
