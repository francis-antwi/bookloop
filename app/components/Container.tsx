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
  const maxWidthClasses = {
    sm: 'max-w-3xl',
    md: 'max-w-5xl', 
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
    '2xl': 'max-w-[2520px]',
    full: 'max-w-full'
  };

  const paddingClasses = {
    none: '',
    sm: 'px-4 -py-2 sm:px-6 sm:-py-2 md:px-8 md:-py-3 lg:px-12 lg:-py-3 xl:px-16 xl:-py-4',
    md: 'px-4 -py-2 sm:px-6 sm:-py-3 md:px-10 md:-py-3 lg:px-16 lg:-py-4 xl:px-20 xl:-py-4 2xl:px-24 2xl:-py-5',
    lg: 'px-6 -py-3 sm:px-8 sm:-py-3 md:px-12 md:-py-4 lg:px-20 lg:-py-4 xl:px-28 xl:-py-5 2xl:px-32 2xl:-py-5'
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