'use client';

import { IconType } from "react-icons";

interface ButtonProps {
    label: string;
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
    disabled?: boolean;
    outline?: boolean;
    small?: boolean;
    icon?: IconType;
    variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'ghost';
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    loading?: boolean;
    fullWidth?: boolean;
    iconPosition?: 'left' | 'right';
    className?: string;
}

const Button: React.FC<ButtonProps> = ({
    label,
    onClick,
    disabled = false,
    outline = false,
    small = false,
    icon: Icon,
    variant = 'primary',
    size,
    loading = false,
    fullWidth = true,
    iconPosition = 'left',
    className = ''
}) => {
    // Determine the actual size to use
    const actualSize = size || (small ? 'sm' : 'md');

    // Size configurations
    const sizeConfig = {
        xs: {
            padding: 'px-3 py-1.5',
            text: 'text-xs',
            font: 'font-medium',
            iconSize: 14,
            height: 'h-7'
        },
        sm: {
            padding: 'px-4 py-2',
            text: 'text-sm',
            font: 'font-medium',
            iconSize: 16,
            height: 'h-9'
        },
        md: {
            padding: 'px-6 py-3',
            text: 'text-sm',
            font: 'font-semibold',
            iconSize: 18,
            height: 'h-11'
        },
        lg: {
            padding: 'px-8 py-4',
            text: 'text-base',
            font: 'font-semibold',
            iconSize: 20,
            height: 'h-12'
        },
        xl: {
            padding: 'px-10 py-5',
            text: 'text-lg',
            font: 'font-bold',
            iconSize: 24,
            height: 'h-14'
        }
    };

    // Variant configurations
    const variantConfig = {
        primary: {
            solid: 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl',
            outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white bg-transparent',
            focus: 'focus:ring-4 focus:ring-blue-200'
        },
        secondary: {
            solid: 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white shadow-lg hover:shadow-xl',
            outline: 'border-2 border-gray-600 text-gray-600 hover:bg-gray-600 hover:text-white bg-transparent',
            focus: 'focus:ring-4 focus:ring-gray-200'
        },
        success: {
            solid: 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl',
            outline: 'border-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white bg-transparent',
            focus: 'focus:ring-4 focus:ring-green-200'
        },
        danger: {
            solid: 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-xl',
            outline: 'border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white bg-transparent',
            focus: 'focus:ring-4 focus:ring-red-200'
        },
        warning: {
            solid: 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg hover:shadow-xl',
            outline: 'border-2 border-yellow-500 text-yellow-600 hover:bg-yellow-500 hover:text-white bg-transparent',
            focus: 'focus:ring-4 focus:ring-yellow-200'
        },
        ghost: {
            solid: 'bg-transparent hover:bg-gray-100 text-gray-700 hover:text-gray-900',
            outline: 'border-2 border-transparent text-gray-600 hover:bg-gray-50 bg-transparent',
            focus: 'focus:ring-4 focus:ring-gray-100'
        }
    };

    const config = sizeConfig[actualSize];
    const colors = variantConfig[variant];

    // Loading spinner component
    const LoadingSpinner = () => (
        <svg 
            className="animate-spin h-4 w-4 mr-2" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
        >
            <circle 
                className="opacity-25" 
                cx="12" 
                cy="12" 
                r="10" 
                stroke="currentColor" 
                strokeWidth="4"
            />
            <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
        </svg>
    );

    // Button classes
    const buttonClasses = `
        relative inline-flex items-center justify-center
        ${config.padding} ${config.text} ${config.font} ${config.height}
        ${fullWidth ? 'w-full' : 'w-auto'}
        rounded-xl transition-all duration-200 ease-in-out
        ${outline ? colors.outline : colors.solid}
        ${colors.focus}
        ${disabled || loading 
            ? 'opacity-50 cursor-not-allowed transform-none' 
            : 'hover:scale-[1.02] active:scale-[0.98] cursor-pointer'
        }
        focus:outline-none focus:ring-offset-2
        ${className}
    `.trim().replace(/\s+/g, ' ');

    // Icon classes
    const iconClasses = `
        ${iconPosition === 'left' ? 'mr-2' : 'ml-2'}
        ${loading ? 'opacity-0' : 'opacity-100'}
        transition-opacity duration-200
    `;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (!disabled && !loading) {
            onClick(e);
        }
    };

    return (
        <button 
            type="button"
            onClick={handleClick}
            disabled={disabled || loading}
            className={buttonClasses}
        >
            {/* Loading state */}
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <LoadingSpinner />
                    <span className="ml-2">Loading...</span>
                </div>
            )}

            {/* Button content */}
            <div className={`flex items-center justify-center ${loading ? 'opacity-0' : 'opacity-100'}`}>
                {/* Left icon */}
                {Icon && iconPosition === 'left' && (
                    <Icon 
                        size={config.iconSize}
                        className={iconClasses}
                    />
                )}

                {/* Label */}
                <span className="truncate">{label}</span>

                {/* Right icon */}
                {Icon && iconPosition === 'right' && (
                    <Icon 
                        size={config.iconSize}
                        className={iconClasses}
                    />
                )}
            </div>

            {/* Ripple effect */}
            {!disabled && !loading && (
                <div className="absolute inset-0 rounded-xl overflow-hidden">
                    <div className="absolute inset-0 bg-white opacity-0 hover:opacity-10 transition-opacity duration-200 rounded-xl" />
                </div>
            )}
        </button>
    );
};

export default Button;