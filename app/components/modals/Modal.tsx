'use client';

import { useCallback, useEffect, useState } from "react";
import { IoMdClose } from "react-icons/io";
import Button from "../Button";

interface ModalProps {
    isOpen?: boolean;
    onClose: () => void;
    onSubmit: () => void;
    title?: string;
    body?: React.ReactElement;
    footer?: React.ReactElement;
    actionLabel: string;
    disabled?: boolean;
    secondaryAction?: () => void;
    secondaryActionLabel?: string;
}

const Modal: React.FC<ModalProps> = ({
    isOpen = false,
    onClose,
    onSubmit,
    title,
    body,
    footer,
    actionLabel,
    disabled = false,
    secondaryAction,
    secondaryActionLabel,
}) => {
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        setShowModal(isOpen);
    }, [isOpen]);

    const handleClose = useCallback(() => {
        if (disabled) {
           return;
        }
        setShowModal(false);
        setTimeout(()=>{
            onClose();
        }, 300);
    }, [disabled, onClose]);

    const handleSubmit = useCallback(() => {
        if (disabled){
            return;
        } 
        onSubmit();
    }, [disabled, onSubmit]); 

    const handleSecondaryAction = useCallback(() => {
        if (disabled || !secondaryAction){
            return;        
        } 
        secondaryAction();
    }, [disabled, secondaryAction]);

    if (!isOpen) {
        return null;
    }

    return (
        <>
            {/* Backdrop with blur effect */}
            <div 
                className={`
                    fixed inset-0 z-50 flex items-center justify-center
                    overflow-x-hidden overflow-y-auto outline-none focus:outline-none
                    backdrop-blur-md bg-black/40
                    transition-all duration-300 ease-out
                    ${showModal ? 'opacity-100' : 'opacity-0'}
                `}
                onClick={handleClose}
            >
                <div 
                    className="
                        relative w-full max-w-lg mx-4
                        transform transition-all duration-300 ease-out
                    "
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Modal Content */}
                    <div className={`
                        transform transition-all duration-300 ease-out
                        ${showModal 
                            ? 'translate-y-0 scale-100 opacity-100' 
                            : 'translate-y-8 scale-95 opacity-0'
                        }
                    `}>
                        {/* Glassmorphic background with gradient border */}
                        <div className="relative">
                            {/* Gradient border effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl blur-sm opacity-75" />
                            
                            <div className="
                                relative bg-white/95 backdrop-blur-xl
                                border border-white/20 rounded-2xl
                                shadow-2xl shadow-black/20
                                overflow-hidden
                            ">
                                {/* Header with enhanced styling */}
                                <div className="relative">
                                    {/* Subtle gradient accent */}
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
                                    
                                    <div className="flex items-center justify-between p-6 border-b border-gray-100/50">
                                        {/* Title with gradient text effect */}
                                        <h2 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                                            {title}
                                        </h2>
                                        
                                        {/* Enhanced close button */}
                                        <button
                                            onClick={handleClose}
                                            type="button"
                                            className="
                                                group relative p-2 rounded-full
                                                bg-gray-100/50 hover:bg-red-50
                                                border border-gray-200/50 hover:border-red-200
                                                transition-all duration-200
                                                hover:scale-110 active:scale-95
                                                focus:outline-none focus:ring-2 focus:ring-red-500/20
                                            "
                                        >
                                            <IoMdClose 
                                                size={18} 
                                                className="text-gray-600 group-hover:text-red-500 transition-colors duration-200" 
                                            />
                                            
                                            {/* Subtle glow effect on hover */}
                                            <div className="absolute inset-0 rounded-full bg-red-500/0 group-hover:bg-red-500/10 transition-all duration-200" />
                                        </button>
                                    </div>
                                </div>

                                {/* Body with enhanced padding and styling */}
                                <div className="relative p-6">
                                    <div className="text-gray-700 leading-relaxed">
                                        {body}
                                    </div>
                                </div>

                                {/* Footer with modern button styling */}
                                <div className="bg-gray-50/50 backdrop-blur-sm p-6 border-t border-gray-100/50">
                                    <div className="flex flex-col gap-4">
                                        {/* Action buttons */}
                                        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                                            {secondaryActionLabel && secondaryAction && (
                                                <button
                                                    onClick={handleSecondaryAction}
                                                    disabled={disabled}
                                                    className="
                                                        px-6 py-3 rounded-xl font-semibold
                                                        bg-white border-2 border-gray-200
                                                        text-gray-700 hover:text-gray-900
                                                        hover:border-gray-300 hover:bg-gray-50
                                                        transform transition-all duration-200
                                                        hover:scale-105 active:scale-95
                                                        disabled:opacity-50 disabled:cursor-not-allowed
                                                        disabled:hover:scale-100
                                                        focus:outline-none focus:ring-2 focus:ring-gray-500/20 focus:ring-offset-2
                                                        shadow-sm hover:shadow-md
                                                    "
                                                >
                                                    {secondaryActionLabel}
                                                </button>
                                            )}
                                            
                                            <button
                                                onClick={handleSubmit}
                                                disabled={disabled}
                                                className="
                                                    px-6 py-3 rounded-xl font-semibold text-white
                                                    bg-gradient-to-r from-blue-600 to-purple-600
                                                    hover:from-blue-700 hover:to-purple-700
                                                    transform transition-all duration-200
                                                    hover:scale-105 active:scale-95
                                                    disabled:opacity-50 disabled:cursor-not-allowed
                                                    disabled:hover:scale-100
                                                    focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2
                                                    shadow-lg hover:shadow-xl
                                                "
                                            >
                                                {actionLabel}
                                            </button>
                                        </div>
                                        
                                        {/* Custom footer content */}
                                        {footer && (
                                            <div className="mt-2">
                                                {footer}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Modal;