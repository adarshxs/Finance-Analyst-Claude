// app/layout.tsx
import type { Metadata } from "next";
import localFont from "next/font/local";
import { ClerkProvider, SignedIn, SignedOut, UserButton } from '@clerk/nextjs'; // Import Clerk components
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import TopNavBar from "@/components/TopNavBar"; // Import TopNavBar
import "./globals.css";
import { cn } from "@/lib/utils"; // Import cn utility

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Claude Financial Analyst", // Updated title
  description: "Analyze financial data with AI using Clerk for authentication", // Updated description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Wrap the entire application with ClerkProvider
    <ClerkProvider
       appearance={{
         // Optional: Add baseTheme or variables for styling Clerk components
         // baseTheme: dark // Example if using Clerk's dark theme
         variables: { colorPrimary: '#000000' }, // Example: match primary color
         elements: { // Example: Style the buttons
            socialButtonsBlockButton: "bg-primary hover:bg-primary/90 text-primary-foreground",
         }
       }}
    >
      <html lang="en" suppressHydrationWarning>
        <body
          className={cn(
            "min-h-screen bg-background font-sans antialiased flex flex-col", // Ensure flex layout and use cn
            geistSans.variable,
            geistMono.variable
          )}
        >
          {/* Use ThemeProvider for Shadcn UI theming */}
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {/* Header section */}
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
               <div className="container flex h-14 max-w-screen-2xl items-center px-4"> {/* Use container for centering and padding */}
                 {/* Always render TopNavBar */}
                 <TopNavBar features={{ /* Pass any necessary props to TopNavBar */ }} />

                 {/* Right-aligned items: User Button */}
                 <div className="flex flex-1 items-center justify-end space-x-4">
                   <nav className="flex items-center space-x-1">
                     {/* Show UserButton only when signed in */}
                     <SignedIn>
                       <UserButton
                         afterSignOutUrl="/" // Redirect to landing page on sign out
                         appearance={{
                           elements: {
                             avatarBox: "h-8 w-8", // Adjust size if needed
                           },
                         }}
                       />
                     </SignedIn>
                     {/* The Sign In button for signed-out users will be on the landing page */}
                   </nav>
                 </div>
               </div>
            </header>

            {/* Main content area */}
            <main className="flex-1"> {/* Ensure main content takes remaining vertical space */}
              {children}
            </main>

            {/* Toaster for Shadcn UI toasts */}
            <Toaster />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}