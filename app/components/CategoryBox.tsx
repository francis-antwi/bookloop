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

// Container component for horizontal layout - works perfectly on all screen sizes
export const CategoriesContainer: React.FC<CategoriesContainerProps> = ({ children }) => {
  return (
    <div className="w-full px-2 sm:px-4 py-4 overflow-x-auto">
      <div className="flex items-center justify-center gap-1 xs:gap-2 sm:gap-3 md:gap-4 lg:gap-5 xl:gap-6 min-w-max">
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
        sm:gap-1.5
        md:gap-2
        p-2
        sm:p-3
        md:p-4
        rounded-lg
        sm:rounded-xl
        border
        cursor-pointer
        transition-all
        duration-200
        ease-out
        hover:scale-[1.02]
        hover:shadow-md
        active:scale-[0.98]
        w-[60px]
        h-[60px]
        xs:w-[65px]
        xs:h-[65px]
        sm:w-[70px]
        sm:h-[70px]
        md:w-[75px]
        md:h-[75px]
        lg:w-[80px]
        lg:h-[80px]
        xl:w-[85px]
        xl:h-[85px]
        flex-shrink-0
        ${
          selected
            ? 'bg-blue-50 border-blue-200 shadow-sm'
            : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm'
        }
      `}
    >
      {/* Icon */}
      <Icon 
        size={16}
        className={`
          sm:w-5 sm:h-5
          md:w-6 md:h-6
          lg:w-7 lg:h-7
          xl:w-8 xl:h-8
          transition-colors
          mb-0.5
          sm:mb-1
          ${selected ? 'text-blue-600' : 'text-gray-600 group-hover:text-gray-700'}
        `}
      />

      {/* Label */}
      <div
        className={`
          text-[8px]
          xs:text-[9px]
          sm:text-[10px]
          md:text-xs
          lg:text-sm
          font-medium
          leading-tight
          text-center
          max-w-full
          overflow-hidden
          text-ellipsis
          whitespace-nowrap
          px-1
          ${
            selected
              ? 'text-blue-700'
              : 'text-gray-600 group-hover:text-gray-800'
          }
        `}
      >
        {label}
      </div>
    </div>
  );
};

export default CategoryBox;