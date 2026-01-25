/**
 * Language Preference Manager
 *
 * Handles persistence and retrieval of user language preferences
 * using AsyncStorage. Provides a React hook for easy integration.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import type { Language } from "../types";
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from "../types";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Storage key for language preference */
const LANGUAGE_STORAGE_KEY = "@upi_soundbox:language";

/** Storage key for all app settings */
const SETTINGS_STORAGE_KEY = "@upi_soundbox:settings";

// ============================================================================
// LANGUAGE FUNCTIONS
// ============================================================================

/**
 * Retrieves the saved language preference.
 * Returns the default language if no preference is saved or on error.
 *
 * @returns The saved language or default ('en-IN')
 *
 * @example
 * ```typescript
 * const language = await getLanguage();
 * console.log(language); // 'en-IN' or 'hi-IN', etc.
 * ```
 */
export async function getLanguage(): Promise<Language> {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);

    if (stored && isValidLanguage(stored)) {
      return stored as Language;
    }

    return DEFAULT_LANGUAGE;
  } catch (error) {
    if (__DEV__) {
      console.error("Error reading language preference:", error);
    }
    return DEFAULT_LANGUAGE;
  }
}

/**
 * Saves the language preference.
 *
 * @param language - The language to save
 * @throws Error if the language is invalid
 *
 * @example
 * ```typescript
 * await setLanguage('hi-IN');
 * ```
 */
export async function setLanguage(language: Language): Promise<void> {
  if (!isValidLanguage(language)) {
    throw new Error(`Invalid language: ${language}`);
  }

  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch (error) {
    if (__DEV__) {
      console.error("Error saving language preference:", error);
    }
    throw error;
  }
}

/**
 * Validates that a string is a valid Language type.
 *
 * @param value - Value to check
 * @returns true if valid language
 */
export function isValidLanguage(value: string): value is Language {
  return SUPPORTED_LANGUAGES.some((lang) => lang.code === value);
}

/**
 * Gets the display name for a language code.
 *
 * @param language - Language code
 * @param useNative - Whether to return native script name
 * @returns Display name
 */
export function getLanguageDisplayName(
  language: Language,
  useNative: boolean = false,
): string {
  const info = SUPPORTED_LANGUAGES.find((l) => l.code === language);
  if (!info) return language;
  return useNative ? info.nativeName : info.englishName;
}

// ============================================================================
// REACT HOOK
// ============================================================================

/**
 * React hook for managing language preference.
 * Automatically loads the saved preference on mount and persists changes.
 *
 * @returns Object containing language state and setter
 *
 * @example
 * ```typescript
 * function LanguageSelector() {
 *   const { language, setLanguage, isLoading } = useLanguage();
 *
 *   if (isLoading) return <Text>Loading...</Text>;
 *
 *   return (
 *     <Picker
 *       selectedValue={language}
 *       onValueChange={(value) => setLanguage(value)}
 *     >
 *       <Picker.Item label="English" value="en-IN" />
 *       <Picker.Item label="Hindi" value="hi-IN" />
 *     </Picker>
 *   );
 * }
 * ```
 */
export function useLanguage(): {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
} {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load saved language on mount
  useEffect(() => {
    let mounted = true;

    async function loadLanguage() {
      try {
        const savedLanguage = await getLanguage();
        if (mounted) {
          setLanguageState(savedLanguage);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error ? err : new Error("Failed to load language"),
          );
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadLanguage();

    return () => {
      mounted = false;
    };
  }, []);

  // Wrapper to update state and persist
  const updateLanguage = useCallback(async (newLanguage: Language) => {
    try {
      await setLanguage(newLanguage);
      setLanguageState(newLanguage);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to save language"),
      );
      throw err;
    }
  }, []);

  return {
    language,
    setLanguage: updateLanguage,
    isLoading,
    error,
  };
}

// ============================================================================
// SETTINGS STORAGE (Extended functionality)
// ============================================================================

/**
 * App settings interface for persistence.
 */
interface StoredSettings {
  language: Language;
  isEnabled: boolean;
  volume: number;
  speechRate: number;
  announceSender: boolean;
  minimumAmount: number;
}

/**
 * Default settings.
 */
const DEFAULT_SETTINGS: StoredSettings = {
  language: DEFAULT_LANGUAGE,
  isEnabled: true,
  volume: 1.0,
  speechRate: 0.85,
  announceSender: false,
  minimumAmount: 1,
};

/**
 * Retrieves all app settings.
 *
 * @returns Stored settings or defaults
 */
export async function getSettings(): Promise<StoredSettings> {
  try {
    const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);

    if (stored) {
      const parsed = JSON.parse(stored) as Partial<StoredSettings>;
      // Merge with defaults to handle missing keys
      return { ...DEFAULT_SETTINGS, ...parsed };
    }

    return DEFAULT_SETTINGS;
  } catch (error) {
    if (__DEV__) {
      console.error("Error reading settings:", error);
    }
    return DEFAULT_SETTINGS;
  }
}

/**
 * Saves app settings.
 *
 * @param settings - Partial settings to update
 */
export async function saveSettings(
  settings: Partial<StoredSettings>,
): Promise<void> {
  try {
    const current = await getSettings();
    const updated = { ...current, ...settings };
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    if (__DEV__) {
      console.error("Error saving settings:", error);
    }
    throw error;
  }
}

/**
 * React hook for managing all app settings.
 *
 * @returns Settings state and update functions
 */
export function useSettings(): {
  settings: StoredSettings;
  updateSettings: (updates: Partial<StoredSettings>) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
} {
  const [settings, setSettingsState] =
    useState<StoredSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load settings on mount
  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      try {
        const savedSettings = await getSettings();
        if (mounted) {
          setSettingsState(savedSettings);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error ? err : new Error("Failed to load settings"),
          );
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  // Update settings
  const updateSettings = useCallback(
    async (updates: Partial<StoredSettings>) => {
      try {
        await saveSettings(updates);
        setSettingsState((prev) => ({ ...prev, ...updates }));
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to save settings"),
        );
        throw err;
      }
    },
    [],
  );

  return {
    settings,
    updateSettings,
    isLoading,
    error,
  };
}

// ============================================================================
// CLEAR DATA
// ============================================================================

/**
 * Clears all app data from storage.
 * Useful for reset functionality.
 */
export async function clearAllData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      LANGUAGE_STORAGE_KEY,
      SETTINGS_STORAGE_KEY,
    ]);
  } catch (error) {
    if (__DEV__) {
      console.error("Error clearing data:", error);
    }
    throw error;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  getLanguage,
  setLanguage,
  isValidLanguage,
  getLanguageDisplayName,
  useLanguage,
  getSettings,
  saveSettings,
  useSettings,
  clearAllData,
};
