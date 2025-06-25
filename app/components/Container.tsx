'use client';

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const Container: React.FC<ContainerProps> = ({
  children,
  className = '',
  maxWidth = '2xl',
  padding = 'md'
}) => {
  // Max width variants
  const maxWidthClasses = {
    sm: 'max-w-3xl',
    md: 'max-w-5xl', 
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
    '2xl': 'max-w-[2520px]',
    full: 'max-w-full'
  };

  // Padding variants for better responsive design
  const paddingClasses = {
    none: '',
    sm: 'px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16',
    md: 'px-4 sm:px-6 md:px-10 lg:px-16 xl:px-20 2xl:px-24',
    lg: 'px-6 sm:px-8 md:px-12 lg:px-20 xl:px-28 2xl:px-32'
  };

  return (
    <div 
      className={`
        ${maxWidthClasses[maxWidth]}
        mx-auto
        ${paddingClasses[padding]}
        transition-all
        duration-300
        ease-out
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default Container;