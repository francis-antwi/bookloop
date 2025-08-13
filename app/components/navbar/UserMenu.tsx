"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { AiOutlineMenu } from "react-icons/ai";
import { useRouter } from "next/navigation";
import Avatar from "../Avatar";
import MenuItem from "./MenuItem";
import { User } from "@prisma/client";
import useRegisterModal from "@/app/hooks/useRegisterModal";
import useLoginModal from "@/app/hooks/useLoginModal";
import useRentModal from "@/app/hooks/useRental";
import { signOut, useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiMail, 
  FiHome, 
  FiHeart, 
  FiCalendar, 
  FiList, 
  FiCheck, 
  FiBell, 
  FiLogOut, 
  FiUser, 
  FiPlus, 
  FiBarChart 
} from "react-icons/fi";
import axios from "axios";

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
  const { data: session, update } = useSession(); 
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!currentUser) return;
    axios.get('/api/messages/inbox')
      .then((res) => {
        const unread = res.data.filter((c: any) => c.unread).length;
        setUnreadCount(unread);
      })
      .catch((err) => {
        console.error("Inbox load failed", err);
        setUnreadCount(0);
      });
  }, [currentUser]);

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
      await signOut({ redirect: true, callbackUrl: "/" });
      await update();
    } catch (error) {
      console.error("Sign out failed:", error);
    } finally {
      setIsSigningOut(false);
    }
  };

  const isVerifiedProvider =
    currentUser?.role === "PROVIDER" &&
    currentUser?.isFaceVerified &&
    currentUser?.businessVerified;

  // Check if user is admin - using the correct role from Prisma schema
  const isAdmin = currentUser?.role === 'ADMIN';

  // Debug logging (remove after testing)
  console.log('Current user role:', currentUser?.role);
  console.log('Is admin?', isAdmin);

  const adminMenuItems = isAdmin
    ? [
        { 
          onClick: () => router.push("/admin"), 
          label: "Admin Dashboard", 
          icon: <FiBarChart className="w-4 h-4" />,
          className: "text-blue-600 hover:bg-blue-50 border-t border-gray-100"
        },
      ]
    : [];

  const menuItems = currentUser
    ? [
        { onClick: () => router.push("/"), label: "Home", icon: <FiHome className="w-4 h-4" /> },
        { onClick: () => router.push("/favourites"), label: "Favourites", icon: <FiHeart className="w-4 h-4" /> },
        { onClick: () => router.push("/bookings"), label: "Bookings", icon: <FiCalendar className="w-4 h-4" /> },
        ...(isVerifiedProvider
          ? [
              { onClick: () => router.push("/my-listings"), label: "Listings", icon: <FiList className="w-4 h-4" /> },
              { onClick: () => router.push("/approvals"), label: "Approvals", icon: <FiCheck className="w-4 h-4" /> },
            ]
          : []),
        {
          onClick: () => router.push("/chat/inbox"),
          label: (
            <div className="flex justify-between items-center w-full">
              <span className="flex items-center gap-2">
                <FiMail className="w-4 h-4" />
                Inbox
              </span>
              {unreadCount > 0 && (
                <span className="ml-2 text-xs font-semibold text-white bg-red-500 rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </div>
          ),
        },
        { onClick: () => router.push("/notifications"), label: "Notifications", icon: <FiBell className="w-4 h-4" /> },
        ...(isVerifiedProvider
          ? [{ onClick: onRent, label: "Get Listed", icon: <FiPlus className="w-4 h-4" /> }]
          : []),
        // Include admin menu items here
        ...adminMenuItems,
        {
          onClick: handleSignOut,
          label: "Logout",
          icon: <FiLogOut className="w-4 h-4" />,
          className: "text-red-600 hover:bg-red-50 border-t border-gray-100",
        },
      ]
    : [
        { onClick: loginModal.onOpen, label: "Login", icon: <FiUser className="w-4 h-4" /> },
        { onClick: registerModal.onOpen, label: "Sign Up", icon: <FiPlus className="w-4 h-4" /> },
      ];

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex flex-row items-center gap-3">
        {isVerifiedProvider && (
          <button
            onClick={onRent}
            className="hidden md:flex items-center gap-2 text-sm font-semibold py-3 px-6 rounded-full bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 text-white hover:from-violet-600 hover:via-purple-600 hover:to-pink-600 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 relative overflow-hidden group"
            aria-label="List your property"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4 relative z-10"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            <span className="relative z-10">Get Listed</span>
          </button>
        )}

        <button
          ref={buttonRef}
          onClick={toggleOpen}
          className="p-3 md:py-2 md:px-3 border border-gray-200 flex flex-row items-center gap-3 rounded-full cursor-pointer hover:shadow-lg hover:border-gray-300 transition-all duration-300 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 group relative overflow-hidden"
          aria-expanded={isOpen}
          aria-haspopup="menu"
          aria-label="User menu"
        >
          <div className="text-gray-600 hover:text-gray-800 transition-colors duration-200">
            <AiOutlineMenu size={16} aria-hidden="true" />
          </div>
          <div className="hidden md:block">
            <div className="relative">
              <div className="ring-2 ring-transparent group-hover:ring-blue-200 transition-all duration-300 rounded-full">
                <Avatar src={currentUser?.image} />
              </div>
              {currentUser && (
                <>
                  <span className="sr-only">Online status</span>
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full animate-pulse" aria-hidden="true" />
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
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute z-50 right-0 top-16 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden backdrop-blur-xl"
              role="menu"
              aria-orientation="vertical"
              aria-labelledby="user-menu-button"
            >
              {currentUser && (
                <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar src={currentUser.image} />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate text-gray-900">
                        {currentUser.name || "User"}
                      </p>
                      <p className="text-xs text-gray-600 truncate">
                        {currentUser.email}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {isVerifiedProvider && (
                          <div className="inline-flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                            <span className="text-xs text-green-600 font-medium">Verified Provider</span>
                          </div>
                        )}
                        {isAdmin && (
                          <div className="inline-flex items-center gap-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full" />
                            <span className="text-xs text-blue-600 font-medium">Admin</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="py-2 px-2 space-y-1 max-h-80 overflow-y-auto">
                {menuItems.map((item, index) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`group relative ${item.className || ""}`}
                  >
                    <MenuItem
                      ref={(el) => (menuItemsRef.current[index] = el)}
                      onClick={() => {
                        item.onClick();
                        setIsOpen(false);
                      }}
                      label={
                        <div className="flex items-center gap-3 py-1">
                          <div className={`transition-colors duration-200 ${
                            item.label === "Logout" 
                              ? "text-red-500 group-hover:text-red-600"
                              : item.label === "Admin Dashboard"
                              ? "text-blue-500 group-hover:text-blue-600" 
                              : "text-gray-500 group-hover:text-blue-600"
                          }`}>
                            {item.icon}
                          </div>
                          <span className={`font-medium ${
                            item.label === "Logout" 
                              ? "text-red-600"
                              : item.label === "Admin Dashboard"
                              ? "text-blue-600"
                              : "text-gray-700 group-hover:text-gray-900"
                          }`}>
                            {item.label === "Logout" && isSigningOut
                              ? "Signing out..."
                              : item.label}
                          </span>
                          {isSigningOut && item.label === "Logout" && (
                            <div className="ml-auto">
                              <div className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                            </div>
                          )}
                        </div>
                      }
                      className={`rounded-xl transition-all duration-200 ${
                        item.label === "Logout" 
                          ? "hover:bg-red-50 border-t border-gray-100 mt-2"
                          : item.label === "Admin Dashboard"
                          ? "hover:bg-blue-50 border-t border-gray-100"
                          : "hover:bg-blue-50"
                      }`}
                      role="menuitem"
                      tabIndex={-1}
                      disabled={item.label === "Logout" && isSigningOut}
                    />
                  </motion.div>
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