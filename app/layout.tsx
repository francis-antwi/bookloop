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
import SessionProviderWrapper from "./providers/SessionProviderWrapper";
import Script from "next/script";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth/authOptions";

const font = Nunito({ subsets: ["latin"] });

export const metadata = {
  title: "BookLoop Services",
  description:
    "BookLoop Services lets you book apartments, cars, event centers, restaurants, and appointments with ease. Explore flexible options, secure reservations, and real-time availability.",
  metadataBase: new URL(
    process.env.NODE_ENV === "production"
      ? "https://bookloop-eight.vercel.app"
      : "http://localhost:3000"
  ),
  openGraph: {
    title: "BookLoop Services",
    description:
      "BookLoop Services lets you book apartments, cars, event centers, restaurants, and appointments with ease. Explore flexible options, secure reservations, and real-time availability.",
    url: "https://www.bookloop.site",
    siteName: "BookLoop Services",
    images: [
      {
        url: "/images/logo.png",
        width: 800,
        height: 600,
        alt: "BookLoop Services Logo",
      },
    ],
    locale: "en_GH",
    type: "website",
  },

};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ✅ Get session via getServerSession (this should work with your authOptions)
  const session = await getServerSession(authOptions);

  // 🔍 Debug logging - remove in production
  console.log("🔍 Layout session:", session);
  console.log("🔍 Session user:", session?.user);

  // ✅ Get current user from DB based on session
  let currentUser = null;
  try {
    currentUser = await getCurrentUser();
    console.log("🔍 Current user from DB:", currentUser);
  } catch (err) {
    console.error("❌ Failed to fetch current user from DB:", err);
  }

  return (
    <html lang="en">
      <body className={font.className} suppressHydrationWarning={true}>
        <SessionProviderWrapper session={session}>
          <Client>
            <ToasterProvider />
            <SearchModal />
            <RentalModal />
            <LoginModal />
            <RegisterModal />
            <Navbar currentUser={currentUser} />
            <div className="pb-20 pt-28">{children}</div>
          </Client>

          {/* ✅ Tidio Chat Integration */}
          <Script
            src="//code.tidio.co/dph8r5uefv6snwp4etkml9rwp98eeed5.js"
            strategy="afterInteractive"
          />
        </SessionProviderWrapper>
      </body>
    </html>
  );
}