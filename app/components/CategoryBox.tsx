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

const CategoryBox: React.FC<CategoryBoxProps> = ({ 
  icon: Icon, 
  label, 
  selected 
}) => {
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
        flex
        flex-col
        items-center
        justify-center
        gap-1
        px-2
        py-2
        rounded-lg
        border
        cursor-pointer
        transition-all
        duration-300
        hover:scale-105
        hover:shadow-md
        active:scale-95
        w-16
        h-16
        ${
          selected
            ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
        }
      `}
    >
      <Icon 
        size={20}
        className={`
          transition-colors
          duration-300
          ${selected ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-700'}
        `}
      />

      <div
        className={`
          font-medium
          text-[9px]
          leading-tight
          text-center
          max-w-full
          overflow-hidden
          text-ellipsis
          whitespace-nowrap
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