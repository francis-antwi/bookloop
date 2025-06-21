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

interface UserMenuProps{
    currentUser?: User | null
}

const UserMenu:React.FC<UserMenuProps> = ({
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
    
    const onRent = useCallback(()=>{
        if(!currentUser){
            return loginModal.onOpen();
        }
        rentModal.onOpen();
    },[currentUser,loginModal,rentModal])

    return (
        <div className="relative">
            <div className="flex flex-row items-center gap-3">
                {/* Get Listed Button */}
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
                        to-pink-500
                        text-white
                        hover:from-rose-600
                        hover:to-pink-600
                        transform
                        hover:scale-105
                        transition-all
                        duration-200
                        shadow-lg
                        hover:shadow-xl
                    "
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-4 h-4"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Get Listed
                </button>

                {/* Menu Toggle Button */}
                <button
                    onClick={toggleOpen}
                    className="
                        p-3
                        md:py-2
                        md:px-3
                        border
                        border-slate-200
                        flex
                        flex-row
                        items-center
                        gap-3
                        rounded-full
                        cursor-pointer
                        hover:shadow-lg
                        hover:border-slate-300
                        transition-all
                        duration-200
                        bg-white
                        hover:bg-slate-50
                    "
                >
                    <div className="text-slate-600 hover:text-slate-800 transition-colors">
                        <AiOutlineMenu size={16} />
                    </div>
                    <div className="hidden md:block">
                        <div className="relative">
                            <Avatar src={currentUser?.image} />
                            {currentUser && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                            )}
                        </div>
                    </div>
                </button>
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 z-30"
                        onClick={() => setIsOpen(false)}
                    />
                    
                    <div className="
                        absolute
                        z-40
                        right-0
                        top-14
                        w-72
                        bg-white
                        rounded-2xl
                        shadow-2xl
                        border
                        border-slate-200
                        overflow-hidden
                        animate-in
                        slide-in-from-top-2
                        duration-200
                    ">
                        {currentUser ? (
                            <>
                                {/* User Info Header */}
                                <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <Avatar src={currentUser?.image} />
                                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-900">{currentUser?.name || 'User'}</p>
                                            <p className="text-sm text-slate-600">{currentUser?.email}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Navigation Items */}
                                <div className="py-2">
                                    <div className="px-2 space-y-1">
                                        <MenuItem 
                                            onClick={() => {router.push('/'); setIsOpen(false);}}
                                            label="Home"
                                            icon={
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                                                </svg>
                                            }
                                        />
                                        <MenuItem 
                                            onClick={() => {router.push('/favourites'); setIsOpen(false);}}
                                            label="My Favourites"
                                            icon={
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                                                </svg>
                                            }
                                        />
                                        <MenuItem
                                            onClick={() => {router.push("/bookings"); setIsOpen(false);}}
                                            label="My Bookings"
                                            icon={
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5a2.25 2.25 0 002.25-2.25m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5a2.25 2.25 0 012.25 2.25v7.5" />
                                                </svg>
                                            }
                                        />
                                        <MenuItem 
                                            onClick={() => {router.push("/my-listings"); setIsOpen(false);}}
                                            label="My Listings"
                                            icon={
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V9.75a2.25 2.25 0 00-2.25-2.25h-13.5a2.25 2.25 0 00-2.25 2.25v7.875c0 .621.504 1.125 1.125 1.125H6.75a2.25 2.25 0 002.25-2.25v-4.875c0-.621.504-1.125 1.125-1.125z" />
                                                </svg>
                                            }
                                        />
                                          <MenuItem 
                                            onClick={() => {router.push("/approvals"); setIsOpen(false);}}
                                            label="My Approvals"
                                            icon={
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V9.75a2.25 2.25 0 00-2.25-2.25h-13.5a2.25 2.25 0 00-2.25 2.25v7.875c0 .621.504 1.125 1.125 1.125H6.75a2.25 2.25 0 002.25-2.25v-4.875c0-.621.504-1.125 1.125-1.125z" />
                                                </svg>
                                            }
                                        />
                                        <MenuItem 
                                            onClick={() => {router.push("/notifications"); setIsOpen(false);}}
                                            label="My Notifications"
                                            icon={
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V9.75a2.25 2.25 0 00-2.25-2.25h-13.5a2.25 2.25 0 00-2.25 2.25v7.875c0 .621.504 1.125 1.125 1.125H6.75a2.25 2.25 0 002.25-2.25v-4.875c0-.621.504-1.125 1.125-1.125z" />
                                                </svg>
                                            }
                                        />

                                        <MenuItem 
                                            onClick={() => {onRent(); setIsOpen(false);}}
                                            label="Get Listed"
                                            icon={
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                                </svg>
                                            }
                                        />
                                    </div>
                                    <MenuItem 
                                            onClick={() => {router.push('/contact'); setIsOpen(false);}}
                                            label="Contact Us"
                                            icon={
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                                </svg>
                                            }
                                        />

                                    <hr className="my-2 border-slate-200" />

                    


                                    <div className="px-2">
                                        <MenuItem 
                                            onClick={() => {signOut(); setIsOpen(false);}}
                                            label="Logout"
                                            icon={
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                                                </svg>
                                            }
                                            className="text-red-600 hover:bg-red-50"
                                        />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="py-2">
                                <div className="px-6 py-4 border-b border-slate-200">
                                    <h3 className="font-semibold text-slate-900">Welcome!</h3>
                                    <p className="text-sm text-slate-600">Sign in to access your account</p>
                                </div>
                                <div className="px-2 space-y-1 pt-2">
                                    <MenuItem 
                                        onClick={() => {loginModal.onOpen(); setIsOpen(false);}}
                                        label="Login"
                                        icon={
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                                            </svg>
                                        }
                                        className="text-blue-600 hover:bg-blue-50"
                                    />
                                    <MenuItem 
                                        onClick={() => {registerModal.onOpen(); setIsOpen(false);}}
                                        label="Sign Up"
                                        icon={
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                                            </svg>
                                        }
                                        className="text-green-600 hover:bg-green-50"
                                    />
                                </div>
                                                <div className="px-2 space-y-1">
                                    
                                        
                                    </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default UserMenu;