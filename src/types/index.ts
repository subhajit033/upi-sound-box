/**
 * Core Type Definitions for UPI Soundbox
 * 
 * This file contains all shared interfaces, types, and enums
 * used throughout the application.
 */

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

/**
 * Raw notification payload received from the native Android layer.
 * This is the structure emitted by UPINotificationListener.kt
 */
export interface NotificationPayload {
  /** Android package name of the UPI app (e.g., "com.phonepe.app") */
  packageName: string;
  /** Notification title (e.g., "Payment Received") */
  title: string;
  /** Notification body text containing payment details */
  text: string;
  /** Unix timestamp in milliseconds when notification was received */
  timestamp: number;
}

/**
 * Parsed notification with extracted payment information.
 * Result of processing a raw NotificationPayload.
 */
export interface ParsedNotification {
  /** Extracted payment amount in INR, or null if parsing failed */
  amount: number | null;
  /** Currency code (always "INR" for this app) */
  currency: 'INR';
  /** Extracted sender/payer name if available */
  sender?: string;
  /** Which UPI app sent the notification */
  source: UPISource;
  /** Original notification text for debugging */
  rawText: string;
  /** Whether this appears to be a successful payment */
  isSuccessful: boolean;
  /** Unix timestamp when parsing occurred */
  parsedAt: number;
}

// ============================================================================
// UPI SOURCE TYPES
// ============================================================================

/**
 * Identifier for supported UPI payment applications.
 */
export type UPISource = 'phonepe' | 'gpay' | 'paytm' | 'bhim' | 'unknown';

/**
 * Mapping of Android package names to UPI source identifiers.
 */
export const PACKAGE_TO_SOURCE: Record<string, UPISource> = {
  'com.phonepe.app': 'phonepe',
  'com.google.android.apps.nbu.paisa.user': 'gpay',
  'net.one97.paytm': 'paytm',
  'in.org.npci.upiapp': 'bhim',
} as const;

/**
 * Human-readable names for UPI sources.
 */
export const SOURCE_NAMES: Record<UPISource, string> = {
  phonepe: 'PhonePe',
  gpay: 'Google Pay',
  paytm: 'Paytm',
  bhim: 'BHIM',
  unknown: 'Unknown',
} as const;

// ============================================================================
// LANGUAGE TYPES
// ============================================================================

/**
 * Supported languages for Text-to-Speech announcements.
 * Uses BCP 47 language tags with Indian locale.
 */
export type Language = 
  | 'en-IN'   // English (India)
  | 'hi-IN'   // Hindi
  | 'bn-IN'   // Bengali
  | 'ta-IN'   // Tamil
  | 'te-IN'   // Telugu
  | 'mr-IN'   // Marathi
  | 'gu-IN'   // Gujarati
  | 'kn-IN'   // Kannada
  | 'ml-IN'   // Malayalam
  | 'pa-IN'   // Punjabi
  | 'or-IN';  // Odia

/**
 * Language display information for UI.
 */
export interface LanguageInfo {
  /** BCP 47 language code */
  code: Language;
  /** Native script name (e.g., "हिन्दी") */
  nativeName: string;
  /** English name (e.g., "Hindi") */
  englishName: string;
  /** Whether TTS support is available */
  ttsSupported: boolean;
}

/**
 * All supported languages with metadata.
 */
export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'en-IN', nativeName: 'English', englishName: 'English', ttsSupported: true },
  { code: 'hi-IN', nativeName: 'हिन्दी', englishName: 'Hindi', ttsSupported: true },
  { code: 'bn-IN', nativeName: 'বাংলা', englishName: 'Bengali', ttsSupported: true },
  { code: 'ta-IN', nativeName: 'தமிழ்', englishName: 'Tamil', ttsSupported: true },
  { code: 'te-IN', nativeName: 'తెలుగు', englishName: 'Telugu', ttsSupported: true },
  { code: 'mr-IN', nativeName: 'मराठी', englishName: 'Marathi', ttsSupported: true },
  { code: 'gu-IN', nativeName: 'ગુજરાતી', englishName: 'Gujarati', ttsSupported: true },
  { code: 'kn-IN', nativeName: 'ಕನ್ನಡ', englishName: 'Kannada', ttsSupported: true },
  { code: 'ml-IN', nativeName: 'മലയാളം', englishName: 'Malayalam', ttsSupported: true },
  { code: 'pa-IN', nativeName: 'ਪੰਜਾਬੀ', englishName: 'Punjabi', ttsSupported: true },
  { code: 'or-IN', nativeName: 'ଓଡ଼ିଆ', englishName: 'Odia', ttsSupported: true },
] as const;

/**
 * Default language for the app.
 */
export const DEFAULT_LANGUAGE: Language = 'en-IN';

// ============================================================================
// TTS CONFIGURATION
// ============================================================================

/**
 * Configuration options for Text-to-Speech.
 */
export interface TTSOptions {
  /** Speech pitch (0.5 to 2.0, default 1.0) */
  pitch?: number;
  /** Speech rate (0.5 to 2.0, default 0.85 for clarity) */
  rate?: number;
  /** Volume (0.0 to 1.0, default 1.0) */
  volume?: number;
  /** Specific voice identifier (optional) */
  voice?: string;
}

/**
 * Default TTS options optimized for clarity.
 */
export const DEFAULT_TTS_OPTIONS: Required<Omit<TTSOptions, 'voice'>> = {
  pitch: 1.0,
  rate: 0.85,
  volume: 1.0,
} as const;

// ============================================================================
// APP SETTINGS
// ============================================================================

/**
 * User-configurable app settings.
 */
export interface AppSettings {
  /** Selected language for TTS */
  language: Language;
  /** Whether soundbox is enabled */
  isEnabled: boolean;
  /** TTS volume (0.0 to 1.0) */
  volume: number;
  /** TTS speech rate */
  speechRate: number;
  /** Whether to announce sender name */
  announceSender: boolean;
  /** Minimum amount to announce (filter small amounts) */
  minimumAmount: number;
}

/**
 * Default app settings.
 */
export const DEFAULT_SETTINGS: AppSettings = {
  language: 'en-IN',
  isEnabled: true,
  volume: 1.0,
  speechRate: 0.85,
  announceSender: false,
  minimumAmount: 1,
} as const;

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Result of an async operation that can fail.
 */
export type AsyncResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Event listener cleanup function.
 */
export type CleanupFunction = () => void;

// ============================================================================
// RE-EXPORTS FROM OTHER TYPE FILES
// ============================================================================

export type { UPIAppInfo, UPINotificationPayload } from './UPILinkModule';
