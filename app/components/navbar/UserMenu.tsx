'use client';
import { useCallback, useState } from "react";
import { AiOutlineMenu } from "react-icons/ai";
import { useRouter } from "next/navigation";
import Avatar from "../Avatar";
import MenuItem from "./MenuItem";
import { User } from "@prisma/client";
import useRegisterModal from "@/app/hooks/useRegisterModal";
import useLoginModal from "@/app/hooks/useLoginModal";
import { signOut } from "next-auth/react";
import useRentModal from "@/app/hooks/useRental";

interface UserMenuProps {
    currentUser?: User | null
}

const UserMenu: React.FC<UserMenuProps> = ({
    currentUser
}) => {
    const router = useRouter();
    const registerModal = useRegisterModal();
    const loginModal = useLoginModal();
    const rentModal = useRentModal();
    const [isOpen, setIsOpen] = useState(false);
    
    const toggleOpen = useCallback(() => {
        setIsOpen((value) => !value);
    }, []); 
    
    const onRent = useCallback(() => {
        if (!currentUser) {
            return loginModal.onOpen();
        }
        rentModal.onOpen();
    }, [currentUser, loginModal, rentModal]);

    const closeMenu = useCallback(() => {
        setIsOpen(false);
    }, []);

    const navigateAndClose = useCallback((path: string) => {
        router.push(path);
        closeMenu();
    }, [router, closeMenu]);

    return (
        <div className="relative">
            <div className="flex flex-row items-center gap-3">
                {/* Enhanced Get Listed Button */}
                <button
                    onClick={onRent}
                    className="
                        hidden
                        md:flex
                        items-center
                        gap-2
                        text-sm
                        font-semibold
                        py-3
                        px-6
                        rounded-full
                        bg-gradient-to-r
                        from-rose-500
                        via-pink-500
                        to-purple-500
                        text-white
                        hover:from-rose-600
                        hover:via-pink-600
                        hover:to-purple-600
                        transform
                        hover:scale-105
                        transition-all
                        duration-300
                        shadow-lg
                        hover:shadow-2xl
                        border
                        border-transparent
                        hover:border-white/20
                        backdrop-blur-sm
                        group
                    "
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    <span className="bg-gradient-to-r from-white to-white/90 bg-clip-text">
                        Get Listed
                    </span>
                </button>

                {/* Enhanced Menu Toggle Button */}
                <button
                    onClick={toggleOpen}
                    className="
                        relative
                        p-3
                        md:py-2
                        md:px-3
                        border-2
                        border-slate-200
                        flex
                        flex-row
                        items-center
                        gap-3
                        rounded-full
                        cursor-pointer
                        hover:shadow-xl
                        hover:border-slate-300
                        transition-all
                        duration-300
                        bg-white
                        hover:bg-slate-50
                        group
                        backdrop-blur-sm
                    "
                >
                    <div className="text-slate-600 group-hover:text-slate-800 transition-colors duration-200">
                        <AiOutlineMenu 
                            size={16} 
                            className={`transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`}
                        />
                    </div>
                    <div className="hidden md:block">
                        <div className="relative">
                            <div className="ring-2 ring-transparent group-hover:ring-slate-200 rounded-full transition-all duration-300">
                                <Avatar src={currentUser?.image} />
                            </div>
                            {currentUser && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full animate-pulse shadow-lg"></div>
                            )}
                        </div>
                    </div>
                </button>
            </div>

            {/* Completely Solid Dropdown Menu */}
            {isOpen && (
                <>
                    {/* Solid black backdrop */}
                    <div 
                        className="fixed inset-0 bg-black bg-opacity-50"
                        style={{ zIndex: 9998 }}
                        onClick={closeMenu}
                    />
                    
                    {/* Completely solid dropdown */}
                    <div 
                        className="absolute right-0 top-16 w-80 bg-white rounded-3xl shadow-2xl border-2 border-gray-300 overflow-hidden"
                        style={{ 
                            zIndex: 9999,
                            backgroundColor: '#ffffff',
                            opacity: 1
                        }}
                    >
                        {currentUser ? (
                            <>
                                {/* User Info Header - Completely Solid */}
                                <div 
                                    className="px-6 py-5 border-b border-gray-300"
                                    style={{ backgroundColor: '#f8fafc' }}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <div className="ring-3 ring-blue-100 rounded-full p-1">
                                                <Avatar src={currentUser?.image} />
                                            </div>
                                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full shadow-md"></div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-900 text-lg truncate">
                                                {currentUser?.name || 'User'}
                                            </p>
                                            <p className="text-sm text-slate-600 truncate">
                                                {currentUser?.email}
                                            </p>
                                            <div className="flex items-center gap-1 mt-1">
                                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                <span className="text-xs text-green-600 font-medium">Online</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Navigation Items - Completely Solid */}
                                <div 
                                    className="py-3"
                                    style={{ backgroundColor: '#ffffff' }}
                                >
                                    <div className="px-3 space-y-1">
                                        <MenuItem 
                                            onClick={() => navigateAndClose('/')}
                                            label="Home"
                                            icon={
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                                                </svg>
                                            }
                                        />
                                        <MenuItem 
                                            onClick={() => navigateAndClose('/favourites')}
                                            label="My Favourites"
                                            icon={
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                                                </svg>
                                            }
                                        />
                                        <MenuItem
                                            onClick={() => navigateAndClose('/bookings')}
                                            label="My Bookings"
                                            icon={
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5a2.25 2.25 0 002.25-2.25m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5a2.25 2.25 0 012.25 2.25v7.5" />
                                                </svg>
                                            }
                                        />
                                        <MenuItem 
                                            onClick={() => navigateAndClose('/my-listings')}
                                            label="My Listings"
                                            icon={
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V9.75a2.25 2.25 0 00-2.25-2.25h-13.5a2.25 2.25 0 00-2.25 2.25v7.875c0 .621.504 1.125 1.125 1.125H6.75a2.25 2.25 0 002.25-2.25v-4.875c0-.621.504-1.125 1.125-1.125z" />
                                                </svg>
                                            }
                                        />
                                        <MenuItem 
                                            onClick={() => navigateAndClose('/approvals')}
                                            label="My Approvals"
                                            icon={
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            }
                                        />
                                        <MenuItem 
                                            onClick={() => navigateAndClose('/notifications')}
                                            label="My Notifications"
                                            icon={
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                                                </svg>
                                            }
                                        />
                                        <MenuItem 
                                            onClick={() => {
                                                onRent();
                                                closeMenu();
                                            }}
                                            label="Get Listed"
                                            icon={
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                                </svg>
                                            }
                                            className="bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                                        />
                                    </div>
                                    
                                    <div className="my-3 mx-3">
                                        <hr className="border-gray-300" />
                                    </div>

                                    <div className="px-3">
                                        <MenuItem 
                                            onClick={() => {
                                                signOut();
                                                closeMenu();
                                            }}
                                            label="Logout"
                                            icon={
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                                                </svg>
                                            }
                                            className="text-red-600 hover:bg-red-50 hover:border-red-200 border border-transparent"
                                        />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Guest Welcome Section - Completely Solid */}
                                <div 
                                    className="px-6 py-5 border-b border-gray-300"
                                    style={{ backgroundColor: '#eff6ff' }}
                                >
                                    <div className="text-center">
                                        <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="white" className="w-8 h-8">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                            </svg>
                                        </div>
                                        <h3 className="font-bold text-slate-900 text-xl mb-1">Welcome!</h3>
                                        <p className="text-sm text-slate-600">Join us to unlock amazing features</p>
                                    </div>
                                </div>
                                
                                <div 
                                    className="py-3"
                                    style={{ backgroundColor: '#ffffff' }}
                                >
                                    <div className="px-3 space-y-2">
                                        <MenuItem 
                                            onClick={() => {
                                                loginModal.onOpen();
                                                closeMenu();
                                            }}
                                            label="Login"
                                            icon={
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                                                </svg>
                                            }
                                            className="text-blue-600 hover:bg-blue-50 border border-blue-200 hover:border-blue-300 bg-blue-50"
                                        />
                                        <MenuItem 
                                            onClick={() => {
                                                registerModal.onOpen();
                                                closeMenu();
                                            }}
                                            label="Sign Up"
                                            icon={
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                                                </svg>
                                            }
                                            className="text-green-600 hover:bg-green-50 border border-green-200 hover:border-green-300 bg-green-50"
                                        />
                                        <MenuItem 
                                            onClick={() => navigateAndClose('/contact')}
                                            label="Contact Us"
                                            icon={
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                                </svg>
                                            }
                                            className="text-slate-600 hover:bg-slate-50 border border-slate-200 hover:border-slate-300"
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default UserMenu;