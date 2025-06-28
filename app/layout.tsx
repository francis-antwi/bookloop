import { Nunito } from "next/font/google";
import "./globals.css";
import dynamic from "next/dynamic";
import Client from "./components/Client";
import Navbar from "./components/navbar/Navbar";
import ToasterProvider from "./providers/ToastProvider";
import getCurrentUser from "./actions/getCurrentUser";
import SessionProviderWrapper from "./providers/SessionProviderWrapper";
import Script from "next/script";
import { ErrorBoundary } from "react-error-boundary";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth/authOptions";

const font = Nunito({ subsets: ["latin"] });

// Lazy-loaded modals
const RegisterModal = dynamic(() => import("./components/modals/RegisterModal"), { ssr: false });
const LoginModal = dynamic(() => import("./components/modals/LoginModal"), { ssr: false });
const RentalModal = dynamic(() => import("./components/modals/RentalModal"), { ssr: false });
const SearchModal = dynamic(() => import("./components/SearchModal"), { ssr: false });

export const metadata = {
  title: "BookLoop Services",
  description: "BookLoop Services lets you book apartments, cars, event centers, restaurants, and appointments with ease.",
  metadataBase: new URL(process.env.NODE_ENV === "production" 
    ? "https://bookloop-eight.vercel.app" 
    : "http://localhost:3000"
  ),
  openGraph: {
    title: "BookLoop Services",
    description: "BookLoop Services lets you book apartments, cars, event centers, restaurants, and appointments with ease.",
    url: "https://www.bookloop.site",
    siteName: "BookLoop Services",
    images: [{
      url: "/images/logo.png",
      width: 800,
      height: 600,
      alt: "BookLoop Services Logo",
    }],
    locale: "en_GH",
    type: "website",
  },
  icons: {
    icon: "/images/app.png",
  },
};

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div role="alert" className="p-4 text-red-500">
      <p>Something went wrong:</p>
      <pre className="mt-2">{error.message}</pre>
    </div>
  );
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const currentUser = await getCurrentUser().catch(() => null);

  return (
    <html lang="en">
      <body className={font.className} suppressHydrationWarning={true}>
        <SessionProviderWrapper session={session}>
          <Client>
            <ToasterProvider />
            <ErrorBoundary FallbackComponent={ErrorFallback}>
              <SearchModal />
              <RentalModal />
              <LoginModal />
              <RegisterModal />
              <Navbar currentUser={currentUser} />
              <div className="pb-20 pt-28">
                {children}
              </div>
            </ErrorBoundary>
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