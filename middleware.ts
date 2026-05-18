// Route protection. Kept lightweight (a session-cookie check, no DB call) so
// it stays Edge-compatible — pages and server actions do the real session
// validation. When the backend isn't configured this is a pass-through.
import { NextResponse, type NextRequest } from "next/server";
import { isBackendConfigured } from "@/lib/backend-config";

const PROTECTED_PREFIXES = ["/train", "/practice", "/profile"];
const AUTH_PATHS = ["/sign-in", "/sign-up"];

export function middleware(request: NextRequest) {
  if (!isBackendConfigured) {
    return NextResponse.next();
  }

  const hasSession =
    request.cookies.has("authjs.session-token") ||
    request.cookies.has("__Secure-authjs.session-token");

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );

  if (!hasSession && isProtected) {
    const redirect = new URL("/sign-in", request.url);
    redirect.searchParams.set("next", path);
    return NextResponse.redirect(redirect);
  }

  if (hasSession && AUTH_PATHS.includes(path)) {
    return NextResponse.redirect(new URL("/profile", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
