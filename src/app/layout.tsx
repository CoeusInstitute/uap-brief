import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter, Manrope } from "next/font/google";
import DeskWindowsRoot from "@/components/DeskWindowsRoot";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const ibmPlex = IBM_Plex_Mono({
  variable: "--font-ibm-plex",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "UAP Brief",
  description: "UAP news, scored and sourced.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`graphite-ui ${inter.variable} ${manrope.variable} ${ibmPlex.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <DeskWindowsRoot>
          <a href="#content" className="g-button sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50">
            Skip to content
          </a>
          <Header />
          <div id="content" className="g-workspace flex-1">
            {children}
          </div>
          <Footer />
        </DeskWindowsRoot>
      </body>
    </html>
  );
}
