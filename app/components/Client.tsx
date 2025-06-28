'use client';

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ErrorBoundary } from "react-error-boundary";
import Navbar from "./navbar/Navbar";
import { SafeUser } from "../types"; // Optional type import

const SearchModal = dynamic(() => import("./SearchModal"), { ssr: false });
const RentalModal = dynamic(() => import("./modals/RentalModal"), { ssr: false });
const LoginModal = dynamic(() => import("./modals/LoginModal"), { ssr: false });
const RegisterModal = dynamic(() => import("./modals/RegisterModal"), { ssr: false });

interface ClientProps {
  children: React.ReactNode;
  currentUser: SafeUser | null; // or any if you don't use the type
}

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="p-4 text-red-500">
      <h2>Something went wrong</h2>
      <p>{error.message}</p>
    </div>
  );
}

const Client: React.FC<ClientProps> = ({ children, currentUser }) => {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) return null;

  return (
    <>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <SearchModal />
        <RentalModal />
        <LoginModal />
        <RegisterModal />
        <Navbar currentUser={currentUser} />
      </ErrorBoundary>
      <div className="pb-20 pt-28">
        {children}
      </div>
    </>
  );
};

export default Client;
