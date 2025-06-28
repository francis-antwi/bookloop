import { Nunito } from "next/font/google";
import "./globals.css";
import SessionProviderWrapper from "./providers/SessionProviderWrapper";
import ToasterProvider from "./providers/ToastProvider";
import Script from "next/script";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth/authOptions";
import getCurrentUser from "./actions/getCurrentUser";
import Client from "./components/Client"; 

const font = Nunito({ subsets: ["latin"] });

export const metadata = {
  title: "BookLoop Services",
  description:
    "BookLoop Services lets you book apartments, cars, event centers, restaurants, and appointments with ease.",
  metadataBase: new URL(
    process.env.NODE_ENV === "production"
      ? "https://bookloop-eight.vercel.app"
      : "http://localhost:3000"
  ),
  openGraph: {
    title: "BookLoop Services",
    description:
      "BookLoop Services lets you book apartments, cars, event centers, restaurants, and appointments with ease.",
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
  icons: {
    icon: "/images/app.png",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const currentUser = await getCurrentUser().catch(() => null);

  return (
    <html lang="en">
      <body className={font.className} suppressHydrationWarning>
        <SessionProviderWrapper session={session}>
          <ToasterProvider />
          <Client currentUser={currentUser}>
            {children}
          </Client>
          <Script
            src={process.env.NEXT_PUBLIC_TIDIO_SCRIPT_URL}
            strategy="afterInteractive"
          />
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
