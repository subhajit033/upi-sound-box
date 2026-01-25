/**
 * TypeScript declarations for the UPILinkModule native module.
 * This module provides access to Android notification listener service functionality.
 */

import { NativeModule } from 'react-native';

/**
 * UPI App information returned by native module
 */
export interface UPIAppInfo {
  /** Package name of the UPI app */
  packageName: string;
  /** Human-readable name of the UPI app */
  appName: string;
}

/**
 * UPI notification payload received from native module
 */
export interface UPINotificationPayload {
  /** Package name of the UPI app that sent the notification */
  packageName: string;
  /** Notification title */
  title: string;
  /** Notification body text (may contain payment amount) */
  text: string;
  /** Unix timestamp in milliseconds when notification was received */
  timestamp: number;
}

/**
 * Native module interface for UPI Soundbox functionality
 */
export interface UPILinkModuleInterface extends NativeModule {
  /**
   * Checks if the notification listener service is enabled for this app.
   * @returns Promise that resolves to true if enabled, false otherwise
   */
  isNotificationServiceEnabled(): Promise<boolean>;

  /**
   * Opens the system notification listener settings screen.
   * User can enable/disable notification access for this app.
   * @returns Promise that resolves to true if settings opened successfully
   */
  openNotificationSettings(): Promise<boolean>;

  /**
   * Gets the list of installed UPI payment apps on the device.
   * @returns Promise that resolves to an array of installed UPI apps
   */
  getInstalledUPIApps(): Promise<UPIAppInfo[]>;

  /**
   * Gets all supported UPI app package names (whether installed or not).
   * @returns Promise that resolves to an array of all supported UPI apps
   */
  getSupportedUPIApps(): Promise<UPIAppInfo[]>;

  /**
   * Initializes the notification listener context.
   * Should be called when the app starts to ensure notifications can be received.
   * @returns Promise that resolves to true when initialization is complete
   */
  initializeListener(): Promise<boolean>;
}

declare module 'react-native' {
  interface NativeModulesStatic {
    UPILinkModule: UPILinkModuleInterface;
  }
}
