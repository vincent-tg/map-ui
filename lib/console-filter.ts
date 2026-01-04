/**
 * Filter out browser extension errors from console
 * These errors are harmless and not from our application
 */
export function filterExtensionErrors() {
  if (typeof window === 'undefined') return;

  // Store original console methods
  const originalError = console.error;
  const originalWarn = console.warn;

  // Filter error messages
  console.error = (...args: any[]) => {
    const errorString = args.join(' ');
    
    // Filter out common extension errors
    if (
      errorString.includes('runtime.lastError') ||
      errorString.includes('receiving end does not exist') ||
      errorString.includes('content.js') ||
      errorString.includes('Extension context invalidated') ||
      errorString.includes('chrome-extension://')
    ) {
      // Silently ignore extension errors
      return;
    }
    
    // Log other errors normally
    originalError.apply(console, args);
  };

  // Filter warning messages
  console.warn = (...args: any[]) => {
    const warningString = args.join(' ');
    
    // Filter out extension warnings
    if (
      warningString.includes('runtime.lastError') ||
      warningString.includes('content.js') ||
      warningString.includes('chrome-extension://')
    ) {
      return;
    }
    
    // Log other warnings normally
    originalWarn.apply(console, args);
  };
}

