'use client';

import qs from 'query-string';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { IconType } from 'react-icons';

interface CategoryBoxProps {
  icon: IconType;
  label: string;
  selected?: boolean;
  description?: string;
  isActive?: boolean;
  onActivate?: () => void;
}

const CategoryBox: React.FC<CategoryBoxProps> = ({
  icon: Icon,
  label,
  selected,
  description,
  isActive,
  onActivate,
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
      { url: '/', query: updatedQuery },
      { skipNull: true }
    );

    router.push(url);

    // Toggle the popup
    if (onActivate) {
      onActivate();
    }
  }, [label, params, router, onActivate]);

  return (
    <div
      onClick={handleClick}
      className={`
        group relative flex flex-col items-center justify-center gap-1
        px-2 py-3 md:px-2.5 md:py-3 lg:px-3 lg:py-3.5
        rounded-lg md:rounded-xl border cursor-pointer transition-all duration-300
        hover:scale-[1.02] hover:shadow-lg hover:shadow-black/5 active:scale-[0.98]
        aspect-square w-full max-w-[80px] md:max-w-[70px] lg:max-w-[75px] xl:max-w-[80px]
        ${selected
          ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 text-blue-700 shadow-md shadow-blue-100'
          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'}
      `}
    >
      {selected && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-indigo-400/10 rounded-lg md:rounded-xl blur-xl z-0" />
      )}

      <div
        className={`
          relative z-10 p-1.5 lg:p-2 rounded-md md:rounded-lg transition-all duration-300
          ${selected
            ? 'bg-gradient-to-br from-blue-100 to-indigo-100 shadow-sm'
            : 'bg-gray-100 group-hover:bg-gray-200'}
        `}
      >
        <Icon
          size={16}
          className={`md:w-4 md:h-4 lg:w-5 lg:h-5 transition-all duration-300 ${
            selected ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-700'
          }`}
        />
      </div>

      <div
        className={`
          relative z-10 font-medium md:font-semibold text-[10px] md:text-[10px] lg:text-xs
          text-center whitespace-nowrap overflow-hidden text-ellipsis
          ${selected ? 'text-blue-700' : 'text-gray-600 group-hover:text-gray-800'}
        `}
      >
        {label}

        {/* Click Popup */}
        {isActive && description && (
          <div className="absolute z-50 left-1/2 top-full mt-2 w-44 px-3 py-2 text-[10px]
              text-gray-700 bg-white border border-gray-200 rounded-lg shadow-xl
              transform -translate-x-1/2
          ">
            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 rotate-45 bg-white border-l border-t border-gray-200" />
            {description}
          </div>
        )}
      </div>

      {/* Ripple */}
      <div className="absolute inset-0 rounded-lg md:rounded-xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-blue-400/10 to-blue-400/0 transform -translate-x-full group-active:translate-x-full transition-transform duration-700 ease-out" />
      </div>
    </div>
  );
};

export default CategoryBox;
