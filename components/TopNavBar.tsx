// components/TopNavBar.tsx
"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link"; // Import Link

// Interface for props (keep existing or adjust if needed)
interface TopNavBarProps {
  features?: {
    // Add any feature flags if needed later
  };
}

const TopNavBar: React.FC<TopNavBarProps> = ({ features = {} }) => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Avoid rendering mismatch during hydration for theme toggle
  const renderThemeToggle = () => {
    if (!mounted) {
      // Render a placeholder or null on the server/initial render
      return <div className="h-9 w-9"></div>; // Placeholder matching button size
    }
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Toggle theme">
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setTheme("light")}>
            Light
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("dark")}>
            Dark
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("system")}>
            System
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    // Use flex to space out logo and theme toggle
    <div className="flex items-center justify-between w-full">
      {/* Logo linking to the landing page */}
      <Link href="/" className="font-bold text-xl flex gap-2 items-center" aria-label="Homepage">
         {/* Conditionally render logo based on theme, ensure mounted */}
         {mounted && (
           <Image
             src={theme === "dark" ? "/wordmark-dark.svg" : "/wordmark.svg"}
             alt="Claude Financial Analyst Logo"
             width={112}
             height={20}
             priority // Load logo quickly
           />
         )}
         {!mounted && <div style={{ width: 112, height: 20 }}></div>} {/* Placeholder for SSR */}
      </Link>

      {/* Theme Toggle Button */}
      <div className="flex items-center gap-2">
         {renderThemeToggle()}
      </div>
    </div>
  );
};

export default TopNavBar;