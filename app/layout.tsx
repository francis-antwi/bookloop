import { Nunito } from "next/font/google";
import "./globals.css";
import dynamic from "next/dynamic";
import Client from "./components/Client";
import ToasterProvider from "./providers/ToastProvider";
import SessionProviderWrapper from "./providers/SessionProviderWrapper";
import Script from "next/script";
import { ErrorBoundary } from "react-error-boundary";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth/authOptions";
import getCurrentUser from "./actions/getCurrentUser";


const font = Nunito({ subsets: ["latin"] });

// Lazy-loaded components
const Navbar = dynamic(() => import("./components/navbar/Navbar"));
const SearchModal = dynamic(() => import("./components/SearchModal"));
const RentalModal = dynamic(() => import("./components/modals/RentalModal"));
const LoginModal = dynamic(() => import("./components/modals/LoginModal"));
const RegisterModal = dynamic(() => import("./components/modals/RegisterModal"));

export const metadata = {
  title: "BookLoop Services",
  description: "BookLoop Services lets you book apartments, cars, event centers, restaurants, and appointments with ease.",
  metadataBase: new URL(process.env.NODE_ENV === "production" 
    ? "https://bookloop-eight.vercel.app" 
    : "http://localhost:3000"
  ),
  // ... rest of your metadata
};

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="p-4 text-red-500">
      <h2>Something went wrong</h2>
      <p>{error.message}</p>
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
      <body className={font.className} suppressHydrationWarning>
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