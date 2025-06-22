'use client';
import qs from 'query-string';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { IconType } from 'react-icons';

interface CategoryBoxProps {
  icon: IconType;
  label: string;
  selected?: boolean;
}

interface CategoriesContainerProps {
  children: React.ReactNode;
}

// Container component for horizontal layout
export const CategoriesContainer: React.FC<CategoriesContainerProps> = ({ children }) => {
  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex items-center justify-center gap-3 md:gap-4 lg:gap-5 min-w-max px-4">
        {children}
      </div>
    </div>
  );
};

const CategoryBox: React.FC<CategoryBoxProps> = ({ icon: Icon, label, selected }) => {
  const router = useRouter();
  const params = useSearchParams();

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

  return (
    <div
      onClick={handleClick}
      className={`
        group
        relative
        flex
        flex-col
        items-center
        justify-center
        gap-1
        md:gap-1.5
        lg:gap-2
        px-2
        py-3
        md:px-2.5
        md:py-3
        lg:px-3
        lg:py-3.5
        rounded-lg
        md:rounded-xl
        border
        cursor-pointer
        transition-all
        duration-300
        ease-out
        hover:scale-[1.02]
        hover:shadow-lg
        hover:shadow-black/5
        active:scale-[0.98]
        touch-manipulation
        aspect-square
        w-[70px]
        h-[70px]
        md:w-[65px]
        md:h-[65px]
        lg:w-[70px]
        lg:h-[70px]
        xl:w-[75px]
        xl:h-[75px]
        flex-shrink-0
        ${
          selected
            ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 text-blue-700 shadow-md shadow-blue-100'
            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
        }
      `}
    >
      {/* Background glow effect for selected state */}
      {selected && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-indigo-400/10 rounded-lg md:rounded-xl blur-xl" />
      )}
      
      {/* Icon container with animated background */}
      <div
        className={`
          relative
          p-1.5
          md:p-1.5
          lg:p-2
          rounded-md
          md:rounded-lg
          transition-all
          duration-300
          ${
            selected
              ? 'bg-gradient-to-br from-blue-100 to-indigo-100 shadow-sm'
              : 'bg-gray-100 group-hover:bg-gray-200'
          }
        `}
      >
        <Icon 
          size={16}
          className={`
            md:w-4
            md:h-4
            lg:w-5
            lg:h-5
            transition-all
            duration-300
            ${selected ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-700'}
          `}
        />
      </div>

      {/* Label with improved typography */}
      <div
        className={`
          font-medium
          md:font-semibold
          text-[10px]
          md:text-[10px]
          lg:text-xs
          leading-tight
          max-w-full
          overflow-hidden
          text-ellipsis
          whitespace-nowrap
          text-center
          ${
            selected
              ? 'text-blue-700'
              : 'text-gray-600 group-hover:text-gray-800'
          }
        `}
      >
        {label}
      </div>

      {/* Selection indicator dot */}
      <div
        className={`
          absolute
          -bottom-0.5
          md:-bottom-1
          left-1/2
          transform
          -translate-x-1/2
          w-1
          h-1
          md:w-1.5
          md:h-1.5
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
      <div className="absolute inset-0 rounded-lg md:rounded-xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-blue-400/10 to-blue-400/0 transform -translate-x-full group-active:translate-x-full transition-transform duration-700 ease-out" />
      </div>
    </div>
  );
};

export default CategoryBox;