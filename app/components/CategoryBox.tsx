'use client';
import qs from 'query-string';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { IconType } from 'react-icons';

interface CategoryBoxProps {
  icon: IconType;
  label: string;
  selected?: boolean;
  disabled?: boolean;
  count?: number;
  size?: 'sm' | 'md' | 'lg';
}

const CategoryBox: React.FC<CategoryBoxProps> = ({ 
  icon: Icon, 
  label, 
  selected = false,
  disabled = false,
  count,
  size = 'md'
}) => {
  const router = useRouter();
  const params = useSearchParams();

  const handleClick = useCallback(() => {
    if (!params || disabled) return;

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
  }, [label, params, router, disabled]);

  // Size configurations
  const sizeConfig = {
    sm: {
      container: 'px-3 py-4 gap-2',
      icon: 'p-2',
      iconSize: 18,
      text: 'text-xs',
      minHeight: 'min-h-[80px]'
    },
    md: {
      container: 'px-4 py-5 gap-3',
      icon: 'p-3',
      iconSize: 24,
      text: 'text-sm',
      minHeight: 'min-h-[100px]'
    },
    lg: {
      container: 'px-6 py-6 gap-4',
      icon: 'p-4',
      iconSize: 28,
      text: 'text-base',
      minHeight: 'min-h-[120px]'
    }
  };

  const config = sizeConfig[size];

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-pressed={selected}
      aria-disabled={disabled}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
          e.preventDefault();
          handleClick();
        }
      }}
      className={`
        group
        relative
        flex
        flex-col
        items-center
        justify-center
        w-full
        ${config.container}
        ${config.minHeight}
        rounded-2xl
        border-2
        transition-all
        duration-300
        ease-out
        focus:outline-none
        focus:ring-2
        focus:ring-blue-500/20
        focus:ring-offset-2
        ${
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : `
              cursor-pointer
              hover:scale-[1.02]
              hover:shadow-lg
              hover:shadow-black/5
              active:scale-[0.98]
            `
        }
        ${
          selected
            ? 'bg-gradient-to-br from-blue-50 via-blue-50/80 to-indigo-50 border-blue-300 text-blue-700 shadow-md shadow-blue-100/50'
            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50/80 hover:border-gray-300'
        }
        
        /* Responsive adjustments */
        sm:min-h-[90px]
        md:min-h-[110px]
        lg:min-h-[130px]
        
        /* Mobile optimizations */
        touch-manipulation
        select-none
      `}
    >
      {/* Background glow effect for selected state */}
      {selected && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-400/8 to-indigo-400/8 rounded-2xl blur-xl opacity-60" />
      )}
      
      {/* Icon container with animated background */}
      <div
        className={`
          relative
          ${config.icon}
          rounded-xl
          transition-all
          duration-300
          flex
          items-center
          justify-center
          ${
            selected
              ? 'bg-gradient-to-br from-blue-100 to-indigo-100 shadow-sm shadow-blue-200/30'
              : 'bg-gray-100 group-hover:bg-gray-200'
          }
        `}
      >
        <Icon 
          size={config.iconSize} 
          className={`
            transition-all
            duration-300
            ${selected ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-700'}
            ${disabled ? 'opacity-60' : ''}
          `}
        />
      </div>

      {/* Label with improved typography */}
      <div className="flex flex-col items-center gap-1 flex-1 justify-center">
        <span
          className={`
            font-semibold
            ${config.text}
            text-center
            transition-all
            duration-300
            leading-tight
            max-w-full
            break-words
            ${
              selected
                ? 'text-blue-700'
                : 'text-gray-700 group-hover:text-gray-900'
            }
          `}
        >
          {label}
        </span>
        
        {/* Count badge */}
        {count !== undefined && count > 0 && (
          <span
            className={`
              inline-flex
              items-center
              justify-center
              px-2
              py-0.5
              rounded-full
              text-xs
              font-medium
              transition-all
              duration-300
              ${
                selected
                  ? 'bg-blue-200 text-blue-800'
                  : 'bg-gray-200 text-gray-600 group-hover:bg-gray-300'
              }
            `}
          >
            {count > 999 ? '999+' : count}
          </span>
        )}
      </div>

      {/* Selection indicator dot */}
      <div
        className={`
          absolute
          -bottom-1
          left-1/2
          transform
          -translate-x-1/2
          w-2
          h-2
          rounded-full
          transition-all
          duration-300
          ${
            selected
              ? 'bg-gradient-to-r from-blue-500 to-indigo-500 opacity-100 scale-100'
              : 'bg-gray-400 opacity-0 scale-75'
          }
        `}
      />

      {/* Ripple effect on click */}
      <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/20 to-transparent transform -translate-x-full group-active:translate-x-full transition-transform duration-700 ease-out" />
      </div>

      {/* Loading state overlay */}
      {disabled && (
        <div className="absolute inset-0 bg-white/30 rounded-2xl flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

export default CategoryBox;