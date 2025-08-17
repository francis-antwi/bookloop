'use client';

import { useRouter } from "next/navigation";
import { useState } from "react";
import Heading from "./Heading";
import Button from "./Button";
import RecommendedListings from "./Recommendations";

interface EmptyStateProps {
    title?: string;
    subtitle?: string;
    showReset?: boolean;
    icon?: React.ReactNode;
    variant?: 'default' | 'search' | 'error' | 'success';
    asBackground?: boolean; // New prop to control background behavior
}

const EmptyState: React.FC<EmptyStateProps> = ({
    title = "No exact matches",
    subtitle = "Try changing or removing some of your filters",
    showReset,
    icon,
    variant = 'default',
    asBackground = false
}) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleReset = async () => {
        setIsLoading(true);
        // Add a slight delay for better UX
        setTimeout(() => {
            router.push('/');
            setIsLoading(false);
        }, 300);
    };

    // Variant-based styling
    const variantStyles = {
        default: {
            bg: 'bg-gradient-to-br from-gray-50 to-slate-100',
            iconBg: 'bg-gradient-to-br from-gray-100 to-gray-200',
            iconColor: 'text-gray-400',
            border: 'border-gray-200'
        },
        search: {
            bg: 'bg-gradient-to-br from-blue-50 to-indigo-50',
            iconBg: 'bg-gradient-to-br from-blue-100 to-indigo-100',
            iconColor: 'text-blue-400',
            border: 'border-blue-200'
        },
        error: {
            bg: 'bg-gradient-to-br from-red-50 to-rose-50',
            iconBg: 'bg-gradient-to-br from-red-100 to-rose-100',
            iconColor: 'text-red-400',
            border: 'border-red-200'
        },
        success: {
            bg: 'bg-gradient-to-br from-green-50 to-emerald-50',
            iconBg: 'bg-gradient-to-br from-green-100 to-emerald-100',
            iconColor: 'text-green-400',
            border: 'border-green-200'
        }
    };

    const currentVariant = variantStyles[variant];

    // Default search icon if none provided
    const defaultIcon = (
        <svg
            className="w-16 h-16"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
        </svg>
    );

    // Background positioning classes
    const backgroundClasses = asBackground 
        ? "fixed inset-0 z-[-1] pointer-events-none opacity-10" 
        : "min-h-[60vh] flex items-center justify-center p-8 mt-40 z-0";

    return (
        
        <div className={backgroundClasses}>
            <RecommendedListings/>
            <div 
                className={`
                    relative
                    z-0
                    ${asBackground ? 'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2' : ''}
                    max-w-md
                    w-full
                    rounded-3xl
                    border
                    ${currentVariant.bg}
                    ${currentVariant.border}
                    shadow-lg
                    shadow-black/5
                    p-8
                    text-center
                    animate-fadeIn
                    ${asBackground ? 'scale-125' : ''}
                `}
            >
                {/* Decorative background elements */}
                <div className="absolute top-4 right-4 w-20 h-20 bg-white/20 rounded-full blur-2xl" />
                <div className="absolute bottom-4 left-4 w-16 h-16 bg-white/30 rounded-full blur-xl" />
                
                {/* Icon container */}
                <div className={`relative mb-6 ${asBackground ? 'opacity-15' : ''}`}>
                    <div 
                        className={`
                            inline-flex
                            items-center
                            justify-center
                            w-24
                            h-24
                            rounded-2xl
                            ${currentVariant.iconBg}
                            ${currentVariant.iconColor}
                            shadow-md
                            shadow-black/5
                            animate-bounce-gentle
                        `}
                    >
                        {icon || defaultIcon}
                    </div>
                    
                    {/* Floating dots animation */}
                    <div className="absolute -top-2 -right-2 w-3 h-3 bg-current opacity-20 rounded-full animate-ping" />
                    <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-current opacity-30 rounded-full animate-pulse" />
                </div>

                {/* Content */}
                <div className={`relative z-10 space-y-4 ${asBackground ? 'opacity-20' : ''}`}>
                    <Heading
                        center
                        title={title}
                        subtitle={subtitle}
                    />
                    
                    {showReset && !asBackground && (
                        <div className="pt-6">
                            <Button
                                outline
                                label={isLoading ? "Clearing..." : "Remove all filters"}
                                onClick={handleReset}
                                disabled={isLoading}
                                className={`
                                    w-full
                                    transition-all
                                    duration-300
                                    hover:scale-[1.02]
                                    active:scale-[0.98]
                                    ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}
                                `}
                            />
                        </div>
                    )}
                </div>

                {/* Loading spinner overlay */}
                {isLoading && !asBackground && (
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-sm rounded-3xl flex items-center justify-center">
                        <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmptyState;