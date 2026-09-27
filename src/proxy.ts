import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

// The user guide is linked from the landing page, so visitors can read it before signing up.
// Operator logos are the shared catalogue's brand images (no organization data): public, so a
// phone shows them even while its session token is being refreshed (an image request cannot).
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/guide-utilisateur-afrisaytu.pdf",
  "/api/operators/:operatorId/logo",
  // Vercel Cron has no session: the route checks CRON_SECRET itself.
  "/api/cron/daily",
])

// Every route except the public ones requires a signed-in user.
// Role and organization checks are done again in each Server Action and Route Handler.
export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
}
