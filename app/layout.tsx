import { Suspense } from "react";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { Newsreader, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { SidebarProvider, Sidebar, SidebarLayoutWrapper } from "@/components/Sidebar";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { LanguageProvider } from "@/lib/i18n/context";
import { UmamiAnalytics } from "@/components/analytics/UmamiAnalytics";
import "./globals.css";

const inter = localFont({
  src: "../public/fonts/Inter.ttf",
  variable: "--font-sans",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
  style: ["normal", "italic"],
  fallback: ["Tiempos Text", "Charter", "Georgia", "serif"],
});

const caveat = localFont({
  src: "../public/fonts/Caveat.ttf",
  variable: "--font-script",
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hey Garlic — Delicious Recipes for Every Mood",
  description:
    "From quick weeknight meals to special occasion dishes, Hey Garlic brings you simple, tasty and homemade recipes made with love.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${newsreader.variable} ${caveat.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <UmamiAnalytics />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem('heygarlic_theme');
                var m = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (t === 'dark' || (t === 'system' && m)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full flex font-sans bg-background text-foreground selection:bg-yellow-300 selection:text-black dark:selection:bg-yellow-400 dark:selection:text-black overflow-x-hidden">
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <SidebarProvider>
                <Suspense fallback={null}>
                  <Sidebar />
                </Suspense>
                <SidebarLayoutWrapper>
                  {children}
                </SidebarLayoutWrapper>
              </SidebarProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            className:
              "!bg-card !text-card-foreground !border-border !rounded-xl !shadow-md font-sans text-sm",
          }}
        />
      </body>
    </html>
  );
}
