'use client';
import qs from 'query-string';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { IconType } from 'react-icons';

interface CategoryBoxProps {
  icon: IconType;
  label: string;
  selected?: boolean;
  className?: string;
  color?: string;
  bgColor?: string;
}

const CategoryBox: React.FC<CategoryBoxProps> = ({ 
  icon: Icon, 
  label, 
  selected,
  className = '',
  color = 'from-blue-500 to-indigo-500',
  bgColor = 'from-blue-50 to-indigo-50'
}) => {
  const router = useRouter();
  const params = useSearchParams();
  const [isPressed, setIsPressed] = useState(false);

  const handleClick = useCallback(() => {
    if (!params) return;

    const currentQuery = qs.parse(params.toString());
    const updatedQuery: Record<string, string | string[]> = {
      ...currentQuery,
      category: label,
    };

    if (params.get('category') === label) {
      delete updatedQuery.category;
    }

    const url = qs.stringifyUrl(
      {
        url: '/',
        query: updatedQuery,
      },
      { skipNull: true }
    );

    router.push(url);
  }, [label, params, router]);

  const handleMouseDown = () => setIsPressed(true);
  const handleMouseUp = () => setIsPressed(false);
  const handleMouseLeave = () => setIsPressed(false);

  return (
    <div
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      className={`
        group
        relative
        flex
        flex-col
        items-center
        justify-center
        gap-2
        md:gap-3
        p-3
        md:p-4
        lg:p-5
        rounded-xl
        md:rounded-2xl
        border
        cursor-pointer
        transition-all
        duration-500
        ease-out
        hover:scale-[1.05]
        active:scale-[0.97]
        touch-manipulation
        aspect-square
        w-full
        backdrop-blur-sm
        overflow-hidden
        ${isPressed ? 'scale-[0.95]' : ''}
        ${
          selected
            ? `bg-gradient-to-br ${bgColor} border-white/60 text-blue-700 shadow-xl shadow-blue-500/20 ring-2 ring-blue-200/50`
            : 'bg-white/80 border-gray-200/60 text-gray-600 hover:bg-white/90 hover:border-gray-300/60 hover:shadow-xl hover:shadow-gray-500/10'
        }
        ${className}
      `}
    >
      {/* Animated background layers */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/10 rounded-xl md:rounded-2xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent)] rounded-xl md:rounded-2xl" />
      </div>

      {/* Enhanced glow effect for selected state */}
      {selected && (
        <>
          <div className={`absolute -inset-1 bg-gradient-to-r ${color} rounded-xl md:rounded-2xl blur-lg opacity-20 animate-pulse`} />
          <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-white/10 rounded-xl md:rounded-2xl" />
        </>
      )}

      {/* Floating particles effect */}
      {selected && (
        <div className="absolute inset-0 overflow-hidden rounded-xl md:rounded-2xl">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white/40 rounded-full animate-float"
              style={{
                left: `${20 + (i * 12)}%`,
                top: `${30 + (i * 8)}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${3 + (i * 0.5)}s`
              }}
            />
          ))}
        </div>
      )}
      
      {/* Enhanced icon container */}
      <div
        className={`
          relative
          p-2.5
          md:p-3
          lg:p-4
          rounded-lg
          md:rounded-xl
          transition-all
          duration-500
          transform
          group-hover:scale-110
          group-hover:rotate-3
          ${
            selected
              ? `bg-gradient-to-br ${color} shadow-lg shadow-blue-500/30`
              : 'bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-gray-200 group-hover:to-gray-300 shadow-md'
          }
        `}
      >
        {/* Icon glow effect */}
        {selected && (
          <div className="absolute inset-0 bg-white/20 rounded-lg md:rounded-xl blur-sm" />
        )}
        
        <Icon 
          size={20}
          className={`
            relative
            md:w-6
            md:h-6
            lg:w-7
            lg:h-7
            transition-all
            duration-500
            transform
            group-hover:scale-110
            ${selected ? 'text-white drop-shadow-sm' : 'text-gray-600 group-hover:text-gray-800'}
          `}
        />
      </div>

      {/* Enhanced label with better typography */}
      <div className="relative z-10 text-center px-1">
        <div
          className={`
            font-semibold
            md:font-bold
            text-xs
            md:text-sm
            leading-tight
            transition-all
            duration-300
            transform
            group-hover:scale-105
            ${
              selected
                ? 'text-blue-800 drop-shadow-sm'
                : 'text-gray-700 group-hover:text-gray-900'
            }
          `}
        >
          {label}
        </div>
        
        {/* Subtitle for selected state */}
        {selected && (
          <div className="text-[10px] md:text-xs text-blue-600/80 mt-0.5 font-medium animate-fadeIn">
            Active
          </div>
        )}
      </div>

      {/* Enhanced selection indicators */}
      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 flex gap-1">
        <div
          className={`
            w-2
            h-2
            md:w-2.5
            md:h-2.5
            rounded-full
            transition-all
            duration-500
            ${
              selected
                ? `bg-gradient-to-r ${color} opacity-100 scale-100 shadow-lg`
                : 'bg-gray-300 opacity-0 scale-50'
            }
          `}
        />
        {selected && (
          <div
            className={`
              w-1
              h-1
              md:w-1.5
              md:h-1.5
              rounded-full
              bg-gradient-to-r ${color}
              opacity-60
              animate-pulse
            `}
          />
        )}
      </div>

      {/* Enhanced ripple effect */}
      <div className="absolute inset-0 rounded-xl md:rounded-2xl overflow-hidden">
        <div 
          className={`
            absolute inset-0 
            ${selected 
              ? 'bg-gradient-to-r from-white/0 via-white/20 to-white/0' 
              : 'bg-gradient-to-r from-blue-400/0 via-blue-400/10 to-blue-400/0'
            }
            transform -translate-x-full 
            group-active:translate-x-full 
            transition-transform 
            duration-700 
            ease-out
          `}
        />
      </div>

      {/* Hover border effect */}
      <div 
        className={`
          absolute inset-0 rounded-xl md:rounded-2xl 
          opacity-0 group-hover:opacity-100 
          transition-opacity duration-300
          ${selected 
            ? 'bg-gradient-to-r from-blue-400/20 via-transparent to-indigo-400/20' 
            : 'bg-gradient-to-r from-gray-400/10 via-transparent to-gray-400/10'
          }
        `}
      />

      {/* Focus ring for accessibility */}
      <div className="absolute inset-0 rounded-xl md:rounded-2xl ring-2 ring-transparent group-focus-visible:ring-blue-500 group-focus-visible:ring-offset-2 transition-all duration-200" />
    </div>
  );
};

export default CategoryBox;

// Add these CSS animations to your global CSS or component styles
const styles = `
  @keyframes float {
    0%, 100% {
      transform: translateY(0px) rotate(0deg);
      opacity: 0.4;
    }
    25% {
      transform: translateY(-10px) rotate(90deg);
      opacity: 0.8;
    }
    50% {
      transform: translateY(-20px) rotate(180deg);
      opacity: 1;
    }
    75% {
      transform: translateY(-10px) rotate(270deg);
      opacity: 0.8;
    }
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-float {
    animation: float 4s ease-in-out infinite;
  }

  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out forwards;
  }

  /* Enhanced hover effects */
  .category-box:hover {
    transform: translateY(-4px) scale(1.02);
  }

  .category-box:active {
    transform: translateY(-2px) scale(0.98);
  }

  /* Smooth transitions for mobile touch */
  @media (hover: none) and (pointer: coarse) {
    .category-box:hover {
      transform: none;
    }
    
    .category-box:active {
      transform: scale(0.95);
      transition: transform 0.1s ease-out;
    }
  }
`;