/**
 * useNotificationPermission Hook
 * 
 * Centralized permission state management for notification listener service.
 * Handles initial check, permission request, and automatic rechecking.
 */

import { useCallback, useEffect, useState } from 'react';
import { AppState, NativeModules, Platform } from 'react-native';

const { UPILinkModule } = NativeModules;

/**
 * Return type for the useNotificationPermission hook.
 */
interface UseNotificationPermissionReturn {
  /** Current permission status */
  hasPermission: boolean;
  /** Initial check in progress */
  isLoading: boolean;
  /** Manual recheck in progress */
  isChecking: boolean;
  /** Opens system notification listener settings */
  requestPermission: () => Promise<void>;
  /** Manually refresh permission status */
  recheckPermission: () => Promise<void>;
}

/**
 * Hook for managing notification listener permission state.
 * 
 * Features:
 * - Initial permission check on mount
 * - Automatic recheck when app becomes active (user returns from settings)
 * - Manual recheck capability
 * - Request permission (opens Android settings)
 * 
 * @returns Permission state and control functions
 * 
 * @example
 * ```typescript
 * function PermissionScreen() {
 *   const { 
 *     hasPermission, 
 *     isLoading, 
 *     requestPermission 
 *   } = useNotificationPermission();
 *   
 *   if (isLoading) return <ActivityIndicator />;
 *   
 *   if (!hasPermission) {
 *     return (
 *       <Button 
 *         title="Grant Access" 
 *         onPress={requestPermission} 
 *       />
 *     );
 *   }
 *   
 *   return <Text>Permission granted!</Text>;
 * }
 * ```
 */
export function useNotificationPermission(): UseNotificationPermissionReturn {
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);

  /**
   * Checks if notification listener service is enabled.
   * Returns false on non-Android or if native module unavailable.
   */
  const checkPermission = useCallback(async (): Promise<boolean> => {
    // Only available on Android
    if (Platform.OS !== 'android') {
      return false;
    }

    // Check if native module is available
    if (!UPILinkModule) {
      if (__DEV__) {
        console.warn('UPILinkModule not available');
      }
      return false;
    }

    try {
      const enabled = await UPILinkModule.isNotificationServiceEnabled();
      return Boolean(enabled);
    } catch (error) {
      if (__DEV__) {
        console.error('Error checking notification permission:', error);
      }
      return false;
    }
  }, []);

  /**
   * Manually rechecks permission status.
   * Useful after user returns from settings.
   */
  const recheckPermission = useCallback(async (): Promise<void> => {
    setIsChecking(true);
    try {
      const enabled = await checkPermission();
      setHasPermission(enabled);
    } finally {
      setIsChecking(false);
    }
  }, [checkPermission]);

  /**
   * Opens the system notification listener settings.
   * User must manually enable access for this app.
   */
  const requestPermission = useCallback(async (): Promise<void> => {
    if (Platform.OS !== 'android' || !UPILinkModule) {
      if (__DEV__) {
        console.warn('Cannot request permission: Android only or module unavailable');
      }
      return;
    }

    try {
      await UPILinkModule.openNotificationSettings();
      // Note: Android doesn't provide a callback when permission is granted
      // We rely on the AppState listener to detect when user returns
    } catch (error) {
      if (__DEV__) {
        console.error('Error opening notification settings:', error);
      }
    }
  }, []);

  // Initial permission check on mount
  useEffect(() => {
    let mounted = true;

    async function initialCheck() {
      const enabled = await checkPermission();
      if (mounted) {
        setHasPermission(enabled);
        setIsLoading(false);
      }
    }

    initialCheck();

    return () => {
      mounted = false;
    };
  }, [checkPermission]);

  // AppState listener to detect when user returns from settings
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      // When app becomes active (user returns from settings or background)
      if (nextAppState === 'active') {
        recheckPermission();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [recheckPermission]);

  return {
    hasPermission,
    isLoading,
    isChecking,
    requestPermission,
    recheckPermission,
  };
}

export default useNotificationPermission;
