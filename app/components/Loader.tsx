'use client';
import { PuffLoader, ClipLoader, BeatLoader, RingLoader } from "react-spinners";

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'puff' | 'clip' | 'beat' | 'ring';
  color?: 'blue' | 'purple' | 'rose' | 'emerald' | 'amber';
  message?: string;
  fullScreen?: boolean;
  overlay?: boolean;
}

const Loader: React.FC<LoaderProps> = ({
  size = 'md',
  variant = 'puff',
  color = 'blue',
  message,
  fullScreen = false,
  overlay = false
}) => {
  // Size configurations
  const sizeConfig = {
    sm: { loader: 60, container: 'h-[40vh]' },
    md: { loader: 80, container: 'h-[60vh]' },
    lg: { loader: 100, container: 'h-[70vh]' },
    xl: { loader: 120, container: 'h-[80vh]' }
  };

  // Color configurations
  const colorConfig = {
    blue: {
      primary: '#3B82F6',
      gradient: 'from-blue-400 to-blue-600',
      bg: 'from-blue-50 to-indigo-50',
      text: 'text-blue-600'
    },
    purple: {
      primary: '#8B5CF6',
      gradient: 'from-purple-400 to-purple-600',
      bg: 'from-purple-50 to-violet-50',
      text: 'text-purple-600'
    },
    rose: {
      primary: '#F43F5E',
      gradient: 'from-rose-400 to-rose-600',
      bg: 'from-rose-50 to-pink-50',
      text: 'text-rose-600'
    },
    emerald: {
      primary: '#10B981',
      gradient: 'from-emerald-400 to-emerald-600',
      bg: 'from-emerald-50 to-green-50',
      text: 'text-emerald-600'
    },
    amber: {
      primary: '#F59E0B',
      gradient: 'from-amber-400 to-amber-600',
      bg: 'from-amber-50 to-yellow-50',
      text: 'text-amber-600'
    }
  };

  const currentSize = sizeConfig[size];
  const currentColor = colorConfig[color];

  // Render appropriate loader based on variant
  const renderLoader = () => {
    const loaderProps = {
      size: currentSize.loader,
      color: currentColor.primary
    };

    switch (variant) {
      case 'clip':
        return <ClipLoader {...loaderProps} />;
      case 'beat':
        return <BeatLoader {...loaderProps} margin={8} />;
      case 'ring':
        return <RingLoader {...loaderProps} />;
      default:
        return <PuffLoader {...loaderProps} />;
    }
  };

  const containerClasses = `
    ${fullScreen ? 'fixed inset-0 z-50' : currentSize.container}
    ${overlay ? `bg-gradient-to-br ${currentColor.bg} backdrop-blur-sm` : ''}
    flex
    flex-col
    justify-center
    items-center
    gap-6
    px-4
    transition-all
    duration-500
    ease-out
  `;

  return (
    <div className={containerClasses}>
      {/* Background decoration */}
      {overlay && (
        <>
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-white/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-white/30 rounded-full blur-2xl animate-pulse delay-75" />
        </>
      )}

      {/* Loader container with modern styling */}
      <div className="relative">
        {/* Glow effect behind loader */}
        <div 
          className={`
            absolute
            inset-0
            bg-gradient-to-r
            ${currentColor.gradient}
            opacity-20
            blur-xl
            scale-150
            animate-pulse
          `} 
        />
        
        {/* Main loader */}
        <div className="relative z-10 animate-fadeIn">
          {renderLoader()}
        </div>

        {/* Floating dots around loader */}
        <div className="absolute -top-4 -right-4 w-2 h-2 bg-current opacity-40 rounded-full animate-ping" />
        <div className="absolute -bottom-4 -left-4 w-1.5 h-1.5 bg-current opacity-30 rounded-full animate-ping delay-75" />
        <div className="absolute top-0 left-0 w-1 h-1 bg-current opacity-50 rounded-full animate-ping delay-150" />
      </div>

      {/* Loading message */}
      {message && (
        <div 
          className={`
            ${currentColor.text}
            text-center
            font-medium
            text-lg
            animate-fadeIn
            delay-200
            max-w-xs
          `}
        >
          {message}
        </div>
      )}

      {/* Loading dots indicator */}
      <div className="flex space-x-2 animate-fadeIn delay-300">
        <div 
          className={`
            w-2
            h-2
            bg-gradient-to-r
            ${currentColor.gradient}
            rounded-full
            animate-bounce
          `} 
        />
        <div 
          className={`
            w-2
            h-2
            bg-gradient-to-r
            ${currentColor.gradient}
            rounded-full
            animate-bounce
            delay-75
          `} 
        />
        <div 
          className={`
            w-2
            h-2
            bg-gradient-to-r
            ${currentColor.gradient}
            rounded-full
            animate-bounce
            delay-150
          `} 
        />
      </div>
    </div>
  );
};

export default Loader;