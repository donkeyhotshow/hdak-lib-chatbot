/**
 * Hook for observing element visibility changes
 * Useful for lazy loading, infinite scroll, and scroll detection
 */

import { useEffect, useRef, useCallback } from "react";

export interface UseIntersectionObserverOptions {
  threshold?: number | number[];
  root?: Element | null;
  rootMargin?: string;
  onIntersect?: () => void;
  onLeave?: () => void;
}

export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {}
) {
  const {
    threshold = 0.1,
    root = null,
    rootMargin = "0px",
    onIntersect,
    onLeave,
  } = options;

  const ref = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          onIntersect?.();
        } else {
          onLeave?.();
        }
      });
    },
    [onIntersect, onLeave]
  );

  useEffect(() => {
    // Check if IntersectionObserver is supported
    if (!("IntersectionObserver" in window)) {
      // Fallback: just trigger onIntersect if not supported
      onIntersect?.();
      return;
    }

    const observer = new IntersectionObserver(handleIntersection, {
      threshold,
      root,
      rootMargin,
    });

    observerRef.current = observer;

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [threshold, root, rootMargin, handleIntersection]);

  return ref;
}

/**
 * Hook for detecting if user has manually scrolled
 * Useful for hiding "scroll to bottom" button when user scrolls up
 */
/**
 * Helper to smoothly scroll to element using IntersectionObserver
 * More reliable than scrollIntoView on some devices
 */
export function scrollToElement(
  element: HTMLElement | null,
  options?: ScrollIntoViewOptions & { useObserver?: boolean }
) {
  if (!element) return;

  const { useObserver = false, ...scrollOptions } = options || {};

  if (!useObserver) {
    // Use native scrollIntoView
    element.scrollIntoView?.(scrollOptions);
    return;
  }

  // Use IntersectionObserver for smoother scroll
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          observer.disconnect();
        } else {
          entry.target.scrollIntoView?.(scrollOptions);
        }
      });
    },
    { threshold: 0 }
  );

  observer.observe(element);
}
