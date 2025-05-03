/**
 * Browser and device detection utilities for media handling
 */

const isBrowser = typeof window !== 'undefined';

/**
 * Check if the current device is a mobile device
 */
export const isMobile = (): boolean => {
  if (!isBrowser) return false;
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator?.userAgent || ''
  );
};

/**
 * Check if the current device is iOS
 */
export const isIOS = (): boolean => {
  if (!isBrowser) return false;
  
  return (
    /iPad|iPhone|iPod/.test(navigator?.userAgent || '') ||
    (navigator?.platform === 'MacIntel' && navigator?.maxTouchPoints > 1)
  );
};

/**
 * Check if the current browser is Safari
 */
export const isSafari = (): boolean => {
  if (!isBrowser) return false;
  
  return /^((?!chrome|android).)*safari/i.test(navigator?.userAgent || '');
};

/**
 * Type definition for Window with audioContext
 */
declare global {
  interface Window {
    audioContext?: AudioContext;
  }
} 