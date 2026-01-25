/**
 * UPI Soundbox Service
 * 
 * Main integration module that connects the notification listener,
 * parser, and TTS engine. This is the core service that makes the
 * soundbox functionality work.
 */

import { useCallback, useEffect, useState } from 'react';
import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import type {
    CleanupFunction,
    Language,
    NotificationPayload,
    ParsedNotification
} from '../types';
import { getSettings } from '../utils/languageManager';
import { parseNotification } from '../utils/notificationParser';
import { speakAmount, stopSpeech } from '../utils/ttsEngine';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Event name from native module */
const UPI_MESSAGE_EVENT = 'onUPIMessageReceived';

/** Get native module */
const { UPILinkModule } = NativeModules;

/** Event emitter for native events */
const eventEmitter = Platform.OS === 'android' && UPILinkModule
  ? new NativeEventEmitter(UPILinkModule)
  : null;

// ============================================================================
// SERVICE STATE
// ============================================================================

interface ServiceState {
  isRunning: boolean;
  subscription: { remove: () => void } | null;
  lastNotification: ParsedNotification | null;
  notificationCount: number;
  onNotificationCallback: ((parsed: ParsedNotification) => void) | null;
}

const state: ServiceState = {
  isRunning: false,
  subscription: null,
  lastNotification: null,
  notificationCount: 0,
  onNotificationCallback: null,
};

// ============================================================================
// MAIN SERVICE FUNCTIONS
// ============================================================================

/**
 * Starts the UPI Soundbox service.
 * Begins listening for UPI notifications and announcing amounts.
 * 
 * @param onNotification - Optional callback for each processed notification
 * @returns Cleanup function to stop the service
 * 
 * @example
 * ```typescript
 * // Start the service
 * const stop = startSoundbox((notification) => {
 *   console.log('Received:', notification.amount);
 * });
 * 
 * // Later, stop the service
 * stop();
 * ```
 */
export function startSoundbox(
  onNotification?: (parsed: ParsedNotification) => void
): CleanupFunction {
  if (Platform.OS !== 'android') {
    console.warn('UPI Soundbox is only available on Android');
    return () => {};
  }

  if (state.isRunning) {
    console.warn('Soundbox is already running');
    return () => stopSoundbox();
  }

  if (!eventEmitter) {
    console.error('Native module not available');
    return () => {};
  }

  // Store callback
  state.onNotificationCallback = onNotification || null;

  // Subscribe to native events
  state.subscription = eventEmitter.addListener(
    UPI_MESSAGE_EVENT,
    handleNotification
  );

  state.isRunning = true;
  
  if (__DEV__) {
    console.log('UPI Soundbox started');
  }

  return () => stopSoundbox();
}

/**
 * Stops the UPI Soundbox service.
 * Stops listening for notifications and clears any pending announcements.
 */
export function stopSoundbox(): void {
  if (state.subscription) {
    state.subscription.remove();
    state.subscription = null;
  }

  state.isRunning = false;
  state.onNotificationCallback = null;
  
  // Stop any ongoing speech
  stopSpeech();

  if (__DEV__) {
    console.log('UPI Soundbox stopped');
  }
}

/**
 * Checks if the soundbox service is currently running.
 * 
 * @returns true if running
 */
export function isRunning(): boolean {
  return state.isRunning;
}

/**
 * Gets the last processed notification.
 * 
 * @returns Last notification or null
 */
export function getLastNotification(): ParsedNotification | null {
  return state.lastNotification;
}

/**
 * Gets the total count of processed notifications.
 * 
 * @returns Notification count
 */
export function getNotificationCount(): number {
  return state.notificationCount;
}

// ============================================================================
// NOTIFICATION HANDLER
// ============================================================================

/**
 * Handles incoming UPI notifications from native layer.
 * Parses the notification, applies filters, and triggers TTS.
 */
async function handleNotification(payload: NotificationPayload): Promise<void> {
  try {
    if (__DEV__) {
      console.log('Received notification:', payload);
    }

    // Parse the notification
    const parsed = parseNotification(payload);
    
    // Update state
    state.lastNotification = parsed;
    state.notificationCount++;

    // Get current settings
    const settings = await getSettings();

    // Check if soundbox is enabled
    if (!settings.isEnabled) {
      if (__DEV__) {
        console.log('Soundbox disabled, skipping announcement');
      }
      return;
    }

    // Check if we have a valid amount
    if (parsed.amount === null) {
      if (__DEV__) {
        console.log('No valid amount found, skipping');
      }
      notifyCallback(parsed);
      return;
    }

    // Check minimum amount threshold
    if (parsed.amount < settings.minimumAmount) {
      if (__DEV__) {
        console.log(`Amount ${parsed.amount} below minimum ${settings.minimumAmount}`);
      }
      notifyCallback(parsed);
      return;
    }

    // Check if this is a successful payment
    if (!parsed.isSuccessful) {
      if (__DEV__) {
        console.log('Not a successful payment, skipping');
      }
      notifyCallback(parsed);
      return;
    }

    // Announce the amount
    await speakAmount(parsed.amount, settings.language, {
      volume: settings.volume,
      rate: settings.speechRate,
    });

    // Notify callback
    notifyCallback(parsed);

  } catch (error) {
    if (__DEV__) {
      console.error('Error handling notification:', error);
    }
  }
}

/**
 * Calls the notification callback if set.
 */
function notifyCallback(parsed: ParsedNotification): void {
  if (state.onNotificationCallback) {
    try {
      state.onNotificationCallback(parsed);
    } catch (error) {
      if (__DEV__) {
        console.error('Notification callback error:', error);
      }
    }
  }
}

// ============================================================================
// PERMISSION HELPERS
// ============================================================================

/**
 * Checks if the notification listener service is enabled.
 * 
 * @returns true if enabled
 */
export async function isNotificationAccessEnabled(): Promise<boolean> {
  if (Platform.OS !== 'android' || !UPILinkModule) {
    return false;
  }

  try {
    return await UPILinkModule.isNotificationServiceEnabled();
  } catch (error) {
    if (__DEV__) {
      console.error('Error checking notification access:', error);
    }
    return false;
  }
}

/**
 * Opens the notification listener settings screen.
 * User needs to manually enable access for this app.
 * 
 * @returns true if settings opened successfully
 */
export async function openNotificationSettings(): Promise<boolean> {
  if (Platform.OS !== 'android' || !UPILinkModule) {
    return false;
  }

  try {
    return await UPILinkModule.openNotificationSettings();
  } catch (error) {
    if (__DEV__) {
      console.error('Error opening notification settings:', error);
    }
    return false;
  }
}

/**
 * UPI app info interface.
 */
interface UPIAppInfo {
  packageName: string;
  appName: string;
}

/**
 * Gets the list of installed UPI apps.
 * 
 * @returns Array of installed app info
 */
export async function getInstalledUPIApps(): Promise<UPIAppInfo[]> {
  if (Platform.OS !== 'android' || !UPILinkModule) {
    return [];
  }

  try {
    return await UPILinkModule.getInstalledUPIApps();
  } catch (error) {
    if (__DEV__) {
      console.error('Error getting installed UPI apps:', error);
    }
    return [];
  }
}

// ============================================================================
// MANUAL TESTING
// ============================================================================

/**
 * Simulates a UPI notification for testing purposes.
 * Only works in development mode.
 * 
 * @param amount - Amount to simulate
 * @param source - UPI app source
 */
export async function simulateNotification(
  amount: number,
  source: 'phonepe' | 'gpay' | 'paytm' | 'bhim' = 'phonepe'
): Promise<void> {
  if (!__DEV__) {
    console.warn('simulateNotification only works in development mode');
    return;
  }

  const packageMap = {
    phonepe: 'com.phonepe.app',
    gpay: 'com.google.android.apps.nbu.paisa.user',
    paytm: 'net.one97.paytm',
    bhim: 'in.org.npci.upiapp',
  };

  const payload: NotificationPayload = {
    packageName: packageMap[source],
    title: 'Payment Received',
    text: `₹${amount.toLocaleString('en-IN')} received from Test User`,
    timestamp: Date.now(),
  };

  await handleNotification(payload);
}

/**
 * Tests the TTS with a specific amount and language.
 * 
 * @param amount - Amount to speak
 * @param language - Language to use
 */
export async function testAnnouncement(
  amount: number,
  language: Language
): Promise<void> {
  await speakAmount(amount, language);
}

// ============================================================================
// REACT HOOK
// ============================================================================

/**
 * React hook for using the Soundbox service.
 * Manages service lifecycle and provides status information.
 * 
 * @example
 * ```typescript
 * function SoundboxScreen() {
 *   const { 
 *     isEnabled, 
 *     start, 
 *     stop, 
 *     lastNotification,
 *     hasPermission,
 *     requestPermission
 *   } = useSoundbox();
 *   
 *   return (
 *     <View>
 *       <Switch value={isEnabled} onValueChange={v => v ? start() : stop()} />
 *       {lastNotification && (
 *         <Text>Last: ₹{lastNotification.amount}</Text>
 *       )}
 *     </View>
 *   );
 * }
 * ```
 */
export function useSoundbox() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [lastNotification, setLastNotification] = useState<ParsedNotification | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);

  // Check permission on mount
  useEffect(() => {
    async function checkPermission() {
      const enabled = await isNotificationAccessEnabled();
      setHasPermission(enabled);
    }
    checkPermission();
  }, []);

  // Handle notification updates
  const handleNotificationUpdate = useCallback((parsed: ParsedNotification) => {
    setLastNotification(parsed);
    setNotificationCount(prev => prev + 1);
  }, []);

  // Start service
  const start = useCallback(() => {
    const cleanup = startSoundbox(handleNotificationUpdate);
    setIsEnabled(true);
    return cleanup;
  }, [handleNotificationUpdate]);

  // Stop service
  const stop = useCallback(() => {
    stopSoundbox();
    setIsEnabled(false);
  }, []);

  // Request permission
  const requestPermission = useCallback(async () => {
    const opened = await openNotificationSettings();
    // Check permission after a delay (user needs to toggle it manually)
    if (opened) {
      setTimeout(async () => {
        const enabled = await isNotificationAccessEnabled();
        setHasPermission(enabled);
      }, 1000);
    }
    return opened;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isEnabled) {
        stopSoundbox();
      }
    };
  }, [isEnabled]);

  return {
    isEnabled,
    hasPermission,
    lastNotification,
    notificationCount,
    start,
    stop,
    requestPermission,
    isRunning: isRunning(),
    testAnnouncement,
    simulateNotification: __DEV__ ? simulateNotification : undefined,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  startSoundbox,
  stopSoundbox,
  isRunning,
  getLastNotification,
  getNotificationCount,
  isNotificationAccessEnabled,
  openNotificationSettings,
  getInstalledUPIApps,
  simulateNotification,
  testAnnouncement,
  useSoundbox,
};
