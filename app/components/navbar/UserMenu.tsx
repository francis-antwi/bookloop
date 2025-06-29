"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { AiOutlineMenu } from "react-icons/ai";
import { useRouter } from "next/navigation";
import Avatar from "../Avatar";
import MenuItem from "./MenuItem";
import { User } from "@prisma/client";
import useRegisterModal from "@/app/hooks/useRegisterModal";
import useLoginModal from "@/app/hooks/useLoginModal";
import { signOut } from "next-auth/react";
import useRentModal from "@/app/hooks/useRental";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";

interface UserMenuProps {
  currentUser?: User | null;
}

const UserMenu: React.FC<UserMenuProps> = ({ currentUser }) => {
  const router = useRouter();
  const registerModal = useRegisterModal();
  const loginModal = useLoginModal();
  const rentModal = useRentModal();
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuItemsRef = useRef<(HTMLDivElement | null)[]>([]);
  const { data: session } = useSession();

  const toggleOpen = useCallback(() => {
    setIsOpen((value) => !value);
    setActiveIndex(-1);
  }, []);

  const onRent = useCallback(() => {
    if (!currentUser) {
      return loginModal.onOpen();
    }
    rentModal.onOpen();
  }, [currentUser, loginModal, rentModal]);

  useEffect(() => {
    const handleInteraction = (event: MouseEvent | KeyboardEvent | TouchEvent) => {
      if (event instanceof KeyboardEvent && event.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
        return;
      }

      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        !buttonRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleInteraction);
    document.addEventListener("keydown", handleInteraction);
    document.addEventListener("touchstart", handleInteraction);

    return () => {
      document.removeEventListener("mousedown", handleInteraction);
      document.removeEventListener("keydown", handleInteraction);
      document.removeEventListener("touchstart", handleInteraction);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const menuItems = menuItemsRef.current.filter(Boolean) as HTMLDivElement[];
    if (menuItems.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, menuItems.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && activeIndex >= 0) {
        e.preventDefault();
        menuItems[activeIndex].click();
      } else if (e.key === "Home") {
        e.preventDefault();
        setActiveIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setActiveIndex(menuItems.length - 1);
      }
    };

    if (activeIndex >= 0) {
      menuItems[activeIndex].focus();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, activeIndex]);

  useEffect(() => {
    if (isOpen) {
      setActiveIndex(0);
    }
  }, [isOpen]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut({ redirect: false });
      router.push("/");
    } finally {
      setIsSigningOut(false);
    }
  };

  const isVerifiedProvider =
    currentUser?.role === "PROVIDER" && currentUser?.isFaceVerified;

  const menuItems = currentUser
    ? [
        { onClick: () => router.push("/"), label: "Home" },
        { onClick: () => router.push("/favourites"), label: "Favourites" },
        { onClick: () => router.push("/bookings"), label: "Bookings" },
        ...(isVerifiedProvider
          ? [
              { onClick: () => router.push("/my-listings"), label: "Listings" },
              { onClick: () => router.push("/approvals"), label: "Approvals" },
            ]
          : []),
        { onClick: () => router.push("/notifications"), label: "Notifications" },
        ...(isVerifiedProvider
          ? [{ onClick: onRent, label: "Get Listed" }]
          : []),
        {
          onClick: handleSignOut,
          label: "Logout",
          className: "text-red-600 hover:bg-red-50",
        },
      ]
    : [
        { onClick: loginModal.onOpen, label: "Login" },
        { onClick: registerModal.onOpen, label: "Sign Up" },
      ];

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex flex-row items-center gap-3">
        {isVerifiedProvider && (
          <button
            onClick={onRent}
            className="hidden md:flex items-center gap-2 text-sm font-semibold py-3 px-6 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:from-rose-600 hover:to-pink-600 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
            aria-label="List your property"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-4 h-4"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            Get Listed
          </button>
        )}

        <button
          ref={buttonRef}
          onClick={toggleOpen}
          className="p-3 md:py-2 md:px-3 border border-slate-200 flex flex-row items-center gap-3 rounded-full cursor-pointer hover:shadow-lg hover:border-slate-300 transition-all duration-200 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
          aria-expanded={isOpen}
          aria-haspopup="menu"
          aria-label="User menu"
        >
          <div className="text-slate-600 hover:text-slate-800 transition-colors">
            <AiOutlineMenu size={16} aria-hidden="true" />
          </div>
          <div className="hidden md:block">
            <div className="relative">
              <Avatar src={currentUser?.image} />
              {currentUser && (
                <>
                  <span className="sr-only">Online status</span>
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full" aria-hidden="true" />
                </>
              )}
            </div>
          </div>
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/20"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute z-50 right-0 top-14 w-60 bg-white rounded-xl shadow-2xl border border-slate-200"
              role="menu"
              aria-orientation="vertical"
              aria-labelledby="user-menu-button"
            >
              {currentUser && (
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <Avatar src={currentUser.image} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {currentUser.name || "User"}
                      </p>
                      <p className="text-xs text-slate-600 truncate">
                        {currentUser.email}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="py-1 px-1 space-y-0.5">
                {menuItems.map((item, index) => (
                  <MenuItem
                    key={item.label}
                    ref={(el) => (menuItemsRef.current[index] = el)}
                    onClick={() => {
                      item.onClick();
                      setIsOpen(false);
                    }}
                    label={
                      item.label === "Logout" && isSigningOut
                        ? "Signing out..."
                        : item.label
                    }
                    className={item.className}
                    role="menuitem"
                    tabIndex={-1}
                    disabled={item.label === "Logout" && isSigningOut}
                  />
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserMenu;
