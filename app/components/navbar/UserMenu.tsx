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

interface UserMenuProps {
  currentUser?: User | null;
}

const UserMenu: React.FC<UserMenuProps> = ({ currentUser }) => {
  const router = useRouter();
  const registerModal = useRegisterModal();
  const loginModal = useLoginModal();
  const rentModal = useRentModal();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { data: session } = useSession();

  const toggleOpen = useCallback(() => {
    setIsOpen((value) => !value);
  }, []);

  const onRent = useCallback(() => {
    if (!currentUser) {
      return loginModal.onOpen();
    }
    rentModal.onOpen();
  }, [currentUser, loginModal, rentModal]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !(dropdownRef.current as any).contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscapeKey);
    }

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex flex-row items-center gap-3">
        {currentUser?.role === "PROVIDER" && (
          <button
            onClick={onRent}
            className="hidden md:flex items-center gap-2 text-sm font-semibold py-3 px-6 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:from-rose-600 hover:to-pink-600 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Get Listed
          </button>
        )}

        <button
          onClick={toggleOpen}
          className="p-3 md:py-2 md:px-3 border border-slate-200 flex flex-row items-center gap-3 rounded-full cursor-pointer hover:shadow-lg hover:border-slate-300 transition-all duration-200 bg-white hover:bg-slate-50"
        >
          <div className="text-slate-600 hover:text-slate-800 transition-colors">
            <AiOutlineMenu size={16} />
          </div>
          <div className="hidden md:block">
            <div className="relative">
              <Avatar src={currentUser?.image} />
              {currentUser && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
              )}
            </div>
          </div>
        </button>
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setIsOpen(false)} />
          <div className="absolute z-50 right-0 top-14 w-60 bg-white rounded-xl shadow-2xl border border-slate-200 animate-in slide-in-from-top-2 duration-200">
            {currentUser ? (
              <>
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <Avatar src={currentUser.image} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{currentUser.name || "User"}</p>
                      <p className="text-xs text-slate-600 truncate">{currentUser.email}</p>
                    </div>
                  </div>
                </div>

                <div className="py-1 px-1 space-y-0.5">
                  <MenuItem onClick={() => { router.push("/"); setIsOpen(false); }} label="Home" />
                  <MenuItem onClick={() => { router.push("/favourites"); setIsOpen(false); }} label="Favourites" />
                  <MenuItem onClick={() => { router.push("/bookings"); setIsOpen(false); }} label="Bookings" />

                  {currentUser?.role === "PROVIDER" && (
                    <>
                      <MenuItem onClick={() => { router.push("/my-listings"); setIsOpen(false); }} label="Listings" />
                      <MenuItem onClick={() => { router.push("/approvals"); setIsOpen(false); }} label="Approvals" />
                    </>
                  )}

                  <MenuItem onClick={() => { router.push("/notifications"); setIsOpen(false); }} label="Notifications" />

                  {session?.user?.role === "PROVIDER" && (
                    <MenuItem onClick={() => { onRent(); setIsOpen(false); }} label="Get Listed" />
                  )}

                  <hr className="my-1 border-slate-200" />
                  <MenuItem onClick={() => { signOut(); setIsOpen(false); }} label="Logout" className="text-red-600 hover:bg-red-50" />
                </div>
              </>
            ) : (
              <div className="py-1 px-1 space-y-0.5">
                <MenuItem onClick={() => { loginModal.onOpen(); setIsOpen(false); }} label="Login" />
                <MenuItem onClick={() => { registerModal.onOpen(); setIsOpen(false); }} label="Sign Up" />
                <MenuItem onClick={() => { router.push("/contact"); setIsOpen(false); }} label="Contact Us" />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default UserMenu;
