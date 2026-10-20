import { useState, useEffect } from 'react';

/**
 * Custom hook to debounce a fast-changing value (e.g. search query).
 * Prevents triggering excessive API requests and unnecessary component re-renders.
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
