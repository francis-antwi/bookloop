'use client';

interface HeadingProps {
  title: string;
  subtitle?: string;
  center?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  variant?: 'default' | 'gradient' | 'outlined' | 'minimal';
  className?: string;
  animated?: boolean;
}

const Heading: React.FC<HeadingProps> = ({
  title,
  subtitle,
  center = false,
  size = 'md',
  variant = 'default',
  className = '',
  animated = true
}) => {
  // Size variants for responsive typography
  const sizeClasses = {
    sm: 'text-xl sm:text-2xl',
    md: 'text-2xl sm:text-3xl',
    lg: 'text-3xl sm:text-4xl',
    xl: 'text-4xl sm:text-5xl',
    '2xl': 'text-5xl sm:text-6xl'
  };

  // Variant styles for different visual treatments
  const variantStyles = {
    default: {
      title: 'text-gray-900 font-bold',
      subtitle: 'text-gray-600'
    },
    gradient: {
      title: 'bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent font-bold',
      subtitle: 'text-gray-600'
    },
    outlined: {
      title: 'text-gray-900 font-bold drop-shadow-sm',
      subtitle: 'text-gray-600'
    },
    minimal: {
      title: 'text-gray-800 font-semibold',
      subtitle: 'text-gray-500'
    }
  };

  const currentVariant = variantStyles[variant];

  return (
    <div 
      className={`
        ${center ? 'text-center' : 'text-start'}
        ${animated ? 'animate-fadeInUp' : ''}
        ${className}
      `}
    >
      {/* Title */}
      <h1 
        className={`
          ${sizeClasses[size]}
          ${currentVariant.title}
          leading-tight
          tracking-tight
          transition-all
          duration-300
          ${animated ? 'animate-slideInFromLeft' : ''}
        `}
      >
        {variant === 'outlined' && (
          <span className="relative">
            {title}
            <span className="absolute inset-0 text-white blur-sm -z-10">{title}</span>
          </span>
        )}
        {variant !== 'outlined' && title}
      </h1>

      {/* Subtitle */}
      {subtitle && (
        <p 
          className={`
            ${currentVariant.subtitle}
            font-light
            mt-3
            text-base
            sm:text-lg
            leading-relaxed
            max-w-2xl
            ${center ? 'mx-auto' : ''}
            transition-all
            duration-300
            ${animated ? 'animate-slideInFromLeft delay-100' : ''}
          `}
        >
          {subtitle}
        </p>
      )}

      {/* Decorative elements for gradient variant */}
      {variant === 'gradient' && (
        <div className={`
          mt-4
          flex
          ${center ? 'justify-center' : 'justify-start'}
          ${animated ? 'animate-fadeIn delay-200' : ''}
        `}>
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse delay-75" />
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse delay-150" />
          </div>
        </div>
      )}

      {/* Underline decoration for outlined variant */}
      {variant === 'outlined' && (
        <div className={`
          mt-4
          ${center ? 'mx-auto' : ''}
          w-16
          h-1
          bg-gradient-to-r
          from-blue-500
          to-purple-500
          rounded-full
          ${animated ? 'animate-scaleX delay-150' : ''}
        `} />
      )}
    </div>
  );
};

export default Heading;