import { User } from "@prisma/client";
import Container from "../Container";
import Logo from "./Logo";
import Search from "./Search";
import UserMenu from "./UserMenu";
import Categories from "./Categories";
import { Suspense } from "react";
import Skeleton from "../Skeleton";
import dynamic from "next/dynamic";

// Dynamically import UserMenu with no SSR (if it contains client-side interactions)
const DynamicUserMenu = dynamic(() => import("./UserMenu"), {
  ssr: false,
  loading: () => <Skeleton className="w-8 h-8 rounded-full" />
});

interface NavbarProps {
  currentUser?: User | null;
}

const Navbar: React.FC<NavbarProps> = ({ currentUser }) => {
  return (
    <nav 
      className="fixed w-full bg-white/80 backdrop-blur-md z-10 shadow-sm border-b border-gray-100"
      aria-label="Main navigation"
    >
      <div className="py-3"> {/* Slightly increased for better touch targets */}
        <Container>
          <div className="flex flex-row items-center justify-between gap-4 md:gap-8">
            <Logo />
            
            {/* Wrap Search in Suspense if it has async operations */}
            <Suspense fallback={<div className="flex-1 max-w-md" />}>
              <Search />
            </Suspense>

            {/* Use dynamic import for UserMenu */}
            <DynamicUserMenu currentUser={currentUser} />
          </div>
        </Container>

        {/* Categories with skeleton loading */}
        <Suspense fallback={
          <div className="flex gap-4 px-4 overflow-x-auto py-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-20 rounded-full" />
            ))}
          </div>
        }>
          <Categories />
        </Suspense>
      </div>
    </nav>
  );
};

export default Navbar;