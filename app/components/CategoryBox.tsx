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
        mb-1
        group
        relative
        flex
        flex-col
        items-center
        justify-center
        gap-3
        px-4
        py-6
        rounded-2xl
        border
        cursor-pointer
        transition-all
        duration-300
        ease-out
        hover:scale-[1.02]
        hover:shadow-lg
        hover:shadow-black/5
        active:scale-[0.98]
        ${
          selected
            ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 text-blue-700 shadow-md shadow-blue-100'
            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
        }
      `}
    >
      {/* Background glow effect for selected state */}
      {selected && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-indigo-400/10 rounded-2xl blur-xl" />
      )}
      
      {/* Icon container with animated background */}
      <div
        className={`
          relative
          p-3
          rounded-xl
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
          size={24} 
          className={`
            transition-all
            duration-300
            ${selected ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-700'}
          `}
        />
      </div>

      {/* Label with improved typography */}
      <div
        className={`
          font-semibold
          text-sm
          text-center
          transition-all
          duration-300
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
      <div className="absolute inset-0 rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-blue-400/10 to-blue-400/0 transform -translate-x-full group-active:translate-x-full transition-transform duration-700 ease-out" />
      </div>
    </div>
  );
};

export default CategoryBox;