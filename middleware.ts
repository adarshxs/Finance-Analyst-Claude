// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define ONLY the page routes that should be explicitly protected by middleware redirect
const isProtectedRoute = createRouteMatcher([
  '/finance(.*)', // Protect the main finance app page and any sub-routes
]);

// Define public routes (Clerk's own routes + your landing page are implicitly public if not protected)
// No need to list /api/finance here, as the handler won't protect it.
// const isPublicRoute = createRouteMatcher(['/']); // Example if needed

export default clerkMiddleware((auth, req) => {
  // If it's a protected PAGE route, use auth.protect()
  if (isProtectedRoute(req)) {
    // console.log(`Middleware: Protecting page route: ${req.nextUrl.pathname}`);
    auth.protect();
    // Clerk handles the redirect if user is not authenticated.
  }

  // For all other routes matched by config (including /api/finance),
  // the middleware runs but does nothing explicit.
  // The request proceeds to the respective handler (page or API route).
});

export const config = {
  matcher: [
    // Match all routes except internal Next.js routes and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Include API routes in the matcher so middleware context *could* be available if needed,
    // but our handler above won't protect them.
    '/(api|trpc)(.*)',
  ],
};