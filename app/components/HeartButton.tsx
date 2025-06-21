'use client';
import { AiFillHeart, AiOutlineHeart } from "react-icons/ai";
import { useState } from "react";
import { SafeUser } from "../types";
import useFavorite from "../hooks/useFavourite";

interface HeartButtonProps {
    listingId: string;
    currentUser?: SafeUser | null;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'default' | 'filled' | 'minimal';
    showCount?: boolean;
    favoriteCount?: number;
}

const HeartButton: React.FC<HeartButtonProps> = ({
    listingId,
    currentUser,
    size = 'md',
    variant = 'default',
    showCount = false,
    favoriteCount = 0
}) => {
    const { hasFavorited, toggleFavorite } = useFavorite({
        listingId,
        currentUser
    });
    
    const [isAnimating, setIsAnimating] = useState(false);

    // Size configurations
    const sizeConfig = {
        sm: {
            container: 'w-8 h-8',
            icon: 20,
            pulse: 'w-6 h-6'
        },
        md: {
            container: 'w-10 h-10',
            icon: 24,
            pulse: 'w-8 h-8'
        },
        lg: {
            container: 'w-12 h-12',
            icon: 28,
            pulse: 'w-10 h-10'
        }
    };

    const config = sizeConfig[size];

    const handleToggle = async () => {
        if (!currentUser) return;
        
        setIsAnimating(true);
        await toggleFavorite();
        
        // Reset animation after completion
        setTimeout(() => setIsAnimating(false), 300);
    };

    // Variant styles
    const getVariantStyles = () => {
        switch (variant) {
            case 'filled':
                return {
                    container: `
                        bg-white/90
                        backdrop-blur-sm
                        border
                        border-white/20
                        shadow-lg
                        shadow-black/10
                    `,
                    heartColor: hasFavorited ? 'text-rose-500' : 'text-gray-400'
                };
            case 'minimal':
                return {
                    container: 'bg-transparent',
                    heartColor: hasFavorited ? 'text-rose-500' : 'text-gray-600'
                };
            default:
                return {
                    container: `
                        bg-white/80
                        backdrop-blur-sm
                        border
                        border-white/30
                        shadow-md
                        shadow-black/5
                    `,
                    heartColor: hasFavorited ? 'text-rose-500' : 'text-gray-500'
                };
        }
    };

    const variantStyles = getVariantStyles();

    return (
        <div className="flex items-center gap-2">
            {/* Heart Button */}
            <div
                onClick={handleToggle}
                className={`
                    ${config.container}
                    ${variantStyles.container}
                    rounded-full
                    flex
                    items-center
                    justify-center
                    cursor-pointer
                    transition-all
                    duration-300
                    ease-out
                    hover:scale-110
                    hover:shadow-lg
                    active:scale-95
                    group
                    relative
                    overflow-hidden
                    ${!currentUser ? 'opacity-50 cursor-not-allowed' : ''}
                    ${isAnimating ? 'animate-pulse' : ''}
                `}
            >
                {/* Ripple effect on click */}
                <div className="absolute inset-0 bg-rose-500/20 rounded-full scale-0 group-active:scale-100 transition-transform duration-300" />
                
                {/* Pulse animation for favorites */}
                {hasFavorited && (
                    <div className={`
                        absolute
                        ${config.pulse}
                        bg-rose-500/30
                        rounded-full
                        animate-ping
                        opacity-75
                    `} />
                )}

                {/* Heart Icon */}
                <div className="relative">
                    {hasFavorited ? (
                        <AiFillHeart
                            size={config.icon}
                            className={`
                                ${variantStyles.heartColor}
                                transition-all
                                duration-300
                                filter
                                drop-shadow-sm
                                ${isAnimating ? 'animate-bounce' : ''}
                            `}
                        />
                    ) : (
                        <AiOutlineHeart
                            size={config.icon}
                            className={`
                                ${variantStyles.heartColor}
                                transition-all
                                duration-300
                                group-hover:text-rose-400
                            `}
                        />
                    )}
                </div>

                {/* Sparkle effects for favorited state */}
                {hasFavorited && isAnimating && (
                    <>
                        <div className="absolute -top-1 -right-1 w-1 h-1 bg-rose-400 rounded-full animate-ping" />
                        <div className="absolute -bottom-1 -left-1 w-1 h-1 bg-rose-400 rounded-full animate-ping delay-75" />
                        <div className="absolute top-0 left-0 w-1 h-1 bg-rose-300 rounded-full animate-ping delay-150" />
                    </>
                )}
            </div>

            {/* Favorite Count (optional) */}
            {showCount && favoriteCount > 0 && (
                <span className={`
                    text-sm
                    font-medium
                    text-gray-600
                    transition-all
                    duration-300
                    ${hasFavorited ? 'text-rose-500' : ''}
                `}>
                    {favoriteCount}
                </span>
            )}

            {/* Tooltip for unauthenticated users */}
            {!currentUser && (
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                    Sign in to save favorites
                </div>
            )}
        </div>
    );
};

export default HeartButton;