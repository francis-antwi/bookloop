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

import SessionProviderWrapper from "./providers/SessionProviderWrapper"; // new wrapper
import { authOptions } from "@/pages/api/auth/[...nextauth]";

const font = Nunito({
  subsets: ["latin"],
});

export const metadata = {
  title: "BookLoop Services",
  description:
    "BookLoop Services lets you book apartments, cars, event centers, restaurants, and appointments with ease. Explore flexible options, secure reservations, and real-time availability.",
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
  const session = await getServerSession(authOptions);
  const currentUser = await getCurrentUser();

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
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
