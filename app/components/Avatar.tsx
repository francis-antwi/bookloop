'use client';
import Image from "next/image";
import { useState } from "react";

interface AvatarProps {
    src: string | null | undefined;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    showStatus?: boolean;
    status?: 'online' | 'offline' | 'away' | 'busy';
    name?: string;
    clickable?: boolean;
    onClick?: () => void;
    className?: string;
}

const Avatar: React.FC<AvatarProps> = ({
    src,
    size = 'md',
    showStatus = false,
    status = 'offline',
    name,
    clickable = false,
    onClick,
    className = ''
}) => {
    const [imageError, setImageError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Size configurations
    const sizeConfig = {
        sm: { 
            container: 'w-8 h-8', 
            image: 24, 
            status: 'w-2.5 h-2.5 border', 
            text: 'text-xs'
        },
        md: { 
            container: 'w-10 h-10', 
            image: 30, 
            status: 'w-3 h-3 border-2', 
            text: 'text-sm'
        },
        lg: { 
            container: 'w-12 h-12', 
            image: 36, 
            status: 'w-3.5 h-3.5 border-2', 
            text: 'text-base'
        },
        xl: { 
            container: 'w-16 h-16', 
            image: 48, 
            status: 'w-4 h-4 border-2', 
            text: 'text-lg'
        }
    };

    // Status color configurations
    const statusColors = {
        online: 'bg-green-400',
        offline: 'bg-gray-400',
        away: 'bg-yellow-400',
        busy: 'bg-red-400'
    };

    const config = sizeConfig[size];

    // Generate initials from name
    const getInitials = (name?: string) => {
        if (!name) return '?';
        return name
            .split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    // Generate background color from name
    const getBackgroundColor = (name?: string) => {
        if (!name) return 'bg-gray-500';
        
        const colors = [
            'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
            'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
            'bg-orange-500', 'bg-cyan-500'
        ];
        
        const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[hash % colors.length];
    };

    const handleImageLoad = () => {
        setIsLoading(false);
    };

    const handleImageError = () => {
        setImageError(true);
        setIsLoading(false);
    };

    const containerClasses = `
        relative inline-block ${config.container} 
        ${clickable ? 'cursor-pointer transform transition-all duration-200 hover:scale-105' : ''}
        ${className}
    `;

    const imageClasses = `
        rounded-full object-cover transition-all duration-300
        ${isLoading ? 'opacity-0' : 'opacity-100'}
        ${clickable ? 'hover:ring-2 ring-blue-500 ring-opacity-50' : ''}
    `;

    const fallbackClasses = `
        ${config.container} rounded-full flex items-center justify-center text-white font-semibold
        ${config.text} ${getBackgroundColor(name)} 
        ${clickable ? 'hover:ring-2 ring-blue-500 ring-opacity-50 transform transition-all duration-200' : ''}
        shadow-lg
    `;

    return (
        <div className={containerClasses} onClick={clickable ? onClick : undefined}>
            {/* Loading skeleton */}
            {isLoading && (
                <div className={`${config.container} rounded-full bg-gray-200 animate-pulse`} />
            )}
            
            {/* Main avatar content */}
            {!imageError && src ? (
                <Image
                    className={imageClasses}
                    height={config.image}
                    width={config.image}
                    alt={name || "Avatar"}
                    src={src}
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                    priority={size === 'xl'} // Prioritize larger avatars
                />
            ) : (
                <div className={fallbackClasses}>
                    {name ? getInitials(name) : (
                        <svg 
                            className={`${config.text} opacity-70`} 
                            fill="currentColor" 
                            viewBox="0 0 24 24"
                            width={config.image * 0.6}
                            height={config.image * 0.6}
                        >
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                        </svg>
                    )}
                </div>
            )}

            {/* Status indicator */}
            {showStatus && (
                <div className={`
                    absolute -bottom-0.5 -right-0.5 ${config.status} 
                    ${statusColors[status]} rounded-full border-white
                    shadow-lg animate-pulse
                `} />
            )}

            {/* Hover overlay for clickable avatars */}
            {clickable && (
                <div className="absolute inset-0 rounded-full bg-black bg-opacity-0 hover:bg-opacity-10 transition-all duration-200" />
            )}
        </div>
    );
};

export default Avatar;