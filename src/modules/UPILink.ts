/**
 * UPI Link Module - React Native Bridge for UPI Notification Listener
 *
 * This module provides a clean TypeScript API for interacting with
 * the native Android notification listener service.
 */

import {
    EmitterSubscription,
    NativeEventEmitter,
    NativeModules,
    Platform,
} from 'react-native';
import type { UPIAppInfo, UPINotificationPayload } from '../types/UPILinkModule';

// Event name constant (matches native module)
const UPI_MESSAGE_EVENT = 'onUPIMessageReceived';

// Get the native module
const { UPILinkModule } = NativeModules;

// Create event emitter for native events
const upiEventEmitter = Platform.OS === 'android' 
  ? new NativeEventEmitter(UPILinkModule)
  : null;

/**
 * Checks if the app is running on Android
 */
export function isAndroid(): boolean {
  return Platform.OS === 'android';
}

/**
 * Checks if the notification listener service is enabled for this app.
 * 
 * @returns Promise<boolean> - true if enabled, false otherwise
 * @throws Error if called on non-Android platform
 */
export async function isNotificationServiceEnabled(): Promise<boolean> {
  if (!isAndroid()) {
    console.warn('UPILinkModule is only available on Android');
    return false;
  }
  
  try {
    return await UPILinkModule.isNotificationServiceEnabled();
  } catch (error) {
    console.error('Failed to check notification service status:', error);
    return false;
  }
}

/**
 * Opens the system notification listener settings screen.
 * User needs to manually enable notification access for this app.
 * 
 * @returns Promise<boolean> - true if settings opened successfully
 * @throws Error if called on non-Android platform
 */
export async function openNotificationSettings(): Promise<boolean> {
  if (!isAndroid()) {
    console.warn('UPILinkModule is only available on Android');
    return false;
  }
  
  try {
    return await UPILinkModule.openNotificationSettings();
  } catch (error) {
    console.error('Failed to open notification settings:', error);
    return false;
  }
}

/**
 * Gets the list of installed UPI payment apps on the device.
 * 
 * @returns Promise<UPIAppInfo[]> - Array of installed UPI apps
 */
export async function getInstalledUPIApps(): Promise<UPIAppInfo[]> {
  if (!isAndroid()) {
    console.warn('UPILinkModule is only available on Android');
    return [];
  }
  
  try {
    return await UPILinkModule.getInstalledUPIApps();
  } catch (error) {
    console.error('Failed to get installed UPI apps:', error);
    return [];
  }
}

/**
 * Gets all supported UPI app information (whether installed or not).
 * 
 * @returns Promise<UPIAppInfo[]> - Array of all supported UPI apps
 */
export async function getSupportedUPIApps(): Promise<UPIAppInfo[]> {
  if (!isAndroid()) {
    console.warn('UPILinkModule is only available on Android');
    return [];
  }
  
  try {
    return await UPILinkModule.getSupportedUPIApps();
  } catch (error) {
    console.error('Failed to get supported UPI apps:', error);
    return [];
  }
}

/**
 * Callback type for UPI notification events
 */
export type UPINotificationCallback = (payload: UPINotificationPayload) => void;

/**
 * Subscribes to UPI payment notification events.
 * 
 * @param callback - Function called when a UPI notification is received
 * @returns EmitterSubscription - Call .remove() to unsubscribe
 * 
 * @example
 * ```typescript
 * const subscription = subscribeToUPINotifications((payload) => {
 *   console.log('Received payment:', payload.text);
 *   // Extract amount and speak via TTS
 * });
 * 
 * // Later, when component unmounts:
 * subscription.remove();
 * ```
 */
export function subscribeToUPINotifications(
  callback: UPINotificationCallback
): EmitterSubscription | null {
  if (!isAndroid() || !upiEventEmitter) {
    console.warn('UPI notifications are only available on Android');
    return null;
  }
  
  return upiEventEmitter.addListener(UPI_MESSAGE_EVENT, callback);
}

/**
 * Map of UPI app package names to human-readable names
 */
export const UPI_APP_NAMES: Record<string, string> = {
  'com.phonepe.app': 'PhonePe',
  'com.google.android.apps.nbu.paisa.user': 'Google Pay',
  'net.one97.paytm': 'Paytm',
  'in.org.npci.upiapp': 'BHIM',
};

/**
 * Gets the human-readable app name from a package name
 * 
 * @param packageName - The Android package name
 * @returns The app name or the package name if not found
 */
export function getAppNameFromPackage(packageName: string): string {
  return UPI_APP_NAMES[packageName] || packageName;
}

// Export types
export type { UPIAppInfo, UPINotificationPayload };

// Default export with all functions
export default {
  isAndroid,
  isNotificationServiceEnabled,
  openNotificationSettings,
  getInstalledUPIApps,
  getSupportedUPIApps,
  subscribeToUPINotifications,
  getAppNameFromPackage,
  UPI_APP_NAMES,
};
