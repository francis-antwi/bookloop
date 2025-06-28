import { Nunito } from "next/font/google";
import "./globals.css";
import Client from "./components/Client";
import Navbar from "./components/navbar/Navbar";
import RegisterModal from "./components/modals/RegisterModal";
import ToasterProvider from "./providers/ToastProvider";
import getCurrentUser from "./actions/getCurrentUser";
import LoginModal from "./components/modals/LoginModal";
import RentalModal from "./components/modals/RentalModal";
import SearchModal from "./components/SearchModal";
import { getServerSession } from "next-auth";
import SessionProviderWrapper from "./providers/SessionProviderWrapper";
import Script from "next/script";
import { authOptions } from "./auth/authOptions";
import { Metadata } from "next";

const font = Nunito({
  subsets: ["latin"],
  display: 'swap', // Better font loading performance
  variable: '--font-nunito', // CSS variable for flexible usage
});

export const metadata: Metadata = {
  title: {
    default: "BookLoop Services",
    template: "%s | BookLoop Services"
  },
  description: "Book apartments, cars, event centers, and more with ease.",
  metadataBase: new URL(process.env.NODE_ENV === 'production' 
    ? 'https://bookloop-eight.vercel.app' 
    : 'http://localhost:3000'
  ),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "BookLoop Services",
    description: "Book various services with real-time availability.",
    url: "https://www.bookloop.site",
    siteName: "BookLoop Services",
    images: [
      {
        url: "/images/logo.png",
        width: 800,
        height: 600,
        alt: "BookLoop Logo",
      },
    ],
    locale: "en_GH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BookLoop Services",
    description: "Your one-stop booking platform",
    images: ["/images/logo.png"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  themeColor: "#ffffff",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, currentUser] = await Promise.all([
    getServerSession(authOptions),
    getCurrentUser(),
  ]);

  return (
    <html lang="en" className={font.variable} suppressHydrationWarning>
      <head>
        {/* Preconnect to important third-party origins */}
        <link rel="preconnect" href="https://code.tidio.co" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://code.tidio.co" />
        
        {/* Preload critical resources */}
        <link rel="preload" href={font.src} as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-gray-50">
        <SessionProviderWrapper session={session}>
          <Client>
            <ToasterProvider />
            <SearchModal />
            <RentalModal />
            <LoginModal />
            <RegisterModal />
            <Navbar currentUser={currentUser} />
            <main className="pb-20 pt-28">
              {children}
            </main>
          </Client>
          
          {/* Async third-party scripts with fallback handling */}
          <Script
            src="//code.tidio.co/dph8r5uefv6snwp4etkml9rwp98eeed5.js"
            strategy="lazyOnload"
            onError={(e) => console.error('Tidio script failed to load', e)}
          />
        </SessionProviderWrapper>
      </body>
    </html>
  );
}