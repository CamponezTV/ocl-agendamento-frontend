import { useEffect } from 'react';

export const useBodyScrollLock = (isLocked: boolean) => {
  useEffect(() => {
    if (isLocked) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      if (scrollBarWidth > 0) {
        document.body.style.paddingRight = `${scrollBarWidth}px`;
      }
      
      return () => {
        document.body.style.overflow = originalStyle;
        document.body.style.paddingRight = '0px';
      };
    }
  }, [isLocked]);
};
