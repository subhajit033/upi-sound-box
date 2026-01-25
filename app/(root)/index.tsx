/**
 * UPI Soundbox - Main Screen
 * 
 * The primary interface for the UPI Soundbox application.
 * Handles notification listening, permission management, and TTS controls.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    DeviceEventEmitter,
    Platform,
    Pressable,
    ScrollView,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNotificationPermission } from '../../src/hooks/useNotificationPermission';
import type { Language, NotificationPayload, ParsedNotification } from '../../src/types';
import { SOURCE_NAMES, SUPPORTED_LANGUAGES } from '../../src/types';
import { getLanguage, setLanguage as saveLanguage } from '../../src/utils/languageManager';
import { parseNotification } from '../../src/utils/notificationParser';
import { speakAmount, stopSpeech } from '../../src/utils/ttsEngine';

// ============================================================================
// CONSTANTS
// ============================================================================

const UPI_MESSAGE_EVENT = 'onUPIMessageReceived';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function HomeScreen() {
  // Permission hook
  const {
    hasPermission,
    isLoading: isPermissionLoading,
    isChecking,
    requestPermission,
    recheckPermission,
  } = useNotificationPermission();

  // Language state
  const [language, setLanguageState] = useState<Language>('en-IN');
  const [isLanguageLoading, setIsLanguageLoading] = useState(true);

  // Last notification state
  const [lastNotification, setLastNotification] = useState<ParsedNotification | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);

  // Test button state
  const [isTestingTTS, setIsTestingTTS] = useState(false);

  // ============================================================================
  // HANDLERS (defined before effects that use them)
  // ============================================================================

  /**
   * Handles incoming UPI notification from native layer.
   */
  const handleNotification = useCallback(
    async (payload: NotificationPayload) => {
      try {
        if (__DEV__) {
          console.log('Notification received:', payload);
        }

        // Parse the notification
        const parsed = parseNotification(payload);
        setLastNotification(parsed);
        setNotificationCount((prev) => prev + 1);

        // Speak amount if valid
        if (parsed.amount !== null && parsed.isSuccessful) {
          await speakAmount(parsed.amount, language);
        }
      } catch (error) {
        if (__DEV__) {
          console.error('Error handling notification:', error);
        }
      }
    },
    [language]
  );

  /**
   * Handles language change.
   */
  const handleLanguageChange = useCallback(async (newLanguage: Language) => {
    setLanguageState(newLanguage);
    try {
      await saveLanguage(newLanguage);
    } catch (error) {
      if (__DEV__) {
        console.error('Error saving language:', error);
      }
    }
  }, []);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Load language preference on mount
  useEffect(() => {
    async function loadLanguage() {
      try {
        const savedLanguage = await getLanguage();
        setLanguageState(savedLanguage);
      } catch (error) {
        if (__DEV__) {
          console.error('Error loading language:', error);
        }
      } finally {
        setIsLanguageLoading(false);
      }
    }

    loadLanguage();
  }, []);

  // Setup notification event listener
  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const subscription = DeviceEventEmitter.addListener(
      UPI_MESSAGE_EVENT,
      handleNotification
    );

    return () => {
      subscription.remove();
    };
  }, [handleNotification]); // Recreate when handler changes

  /**
   * Handles test button press.
   */
  const handleTestTTS = useCallback(async () => {
    if (isTestingTTS) return;

    setIsTestingTTS(true);
    try {
      // Test with ₹500
      await speakAmount(500, language);
      
      // Create mock notification for display
      const mockNotification: ParsedNotification = {
        amount: 500,
        currency: 'INR',
        sender: 'Test User',
        source: 'phonepe',
        rawText: '₹500 received from Test User',
        isSuccessful: true,
        parsedAt: Date.now(),
      };
      setLastNotification(mockNotification);
    } catch (error) {
      if (__DEV__) {
        console.error('Error testing TTS:', error);
      }
    } finally {
      setTimeout(() => setIsTestingTTS(false), 1000);
    }
  }, [language, isTestingTTS]);

  /**
   * Stops any ongoing speech.
   */
  const handleStopTTS = useCallback(() => {
    stopSpeech();
  }, []);

  // ============================================================================
  // RENDER
  // ============================================================================

  // Loading state
  if (isPermissionLoading || isLanguageLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2196F3" />
          <Text className="mt-4 text-gray-600">Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 py-6"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="mb-8 items-center">
          <Text className="text-3xl font-bold text-gray-800">UPI Soundbox</Text>
          <Text className="mt-1 text-gray-500">Payment Notification Reader</Text>
        </View>

        {/* Status Card */}
        <StatusCard 
          hasPermission={hasPermission} 
          isChecking={isChecking}
          notificationCount={notificationCount}
        />

        {/* Permission Button - Only show if no permission */}
        {!hasPermission && (
          <PermissionButton 
            onPress={requestPermission}
            onRecheck={recheckPermission}
            isChecking={isChecking}
          />
        )}

        {/* Language Selector */}
        <LanguageSelector
          currentLanguage={language}
          onLanguageChange={handleLanguageChange}
        />

        {/* Last Notification Display */}
        <LastNotificationCard notification={lastNotification} />

        {/* Test Controls */}
        <TestControls
          onTest={handleTestTTS}
          onStop={handleStopTTS}
          isTesting={isTestingTTS}
          language={language}
        />

        {/* Help Section */}
        <HelpSection />
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Status indicator card showing service status.
 */
function StatusCard({
  hasPermission,
  isChecking,
  notificationCount,
}: {
  hasPermission: boolean;
  isChecking: boolean;
  notificationCount: number;
}) {
  return (
    <View className="mb-4 rounded-xl bg-white p-5 shadow-sm">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          {isChecking ? (
            <ActivityIndicator size="small" color="#2196F3" />
          ) : (
            <View
              className={`h-3 w-3 rounded-full ${
                hasPermission ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
          )}
          <Text
            className={`ml-3 text-base font-semibold ${
              hasPermission ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {isChecking
              ? 'Checking...'
              : hasPermission
                ? 'Service Active'
                : 'Service Inactive'}
          </Text>
        </View>
        
        {hasPermission && notificationCount > 0 && (
          <View className="rounded-full bg-blue-100 px-3 py-1">
            <Text className="text-sm font-medium text-blue-600">
              {notificationCount} received
            </Text>
          </View>
        )}
      </View>

      {!hasPermission && (
        <Text className="mt-3 text-sm text-gray-500">
          Enable notification access to start receiving payment alerts
        </Text>
      )}
    </View>
  );
}

/**
 * Permission request button component.
 */
function PermissionButton({
  onPress,
  onRecheck,
  isChecking,
}: {
  onPress: () => void;
  onRecheck: () => void;
  isChecking: boolean;
}) {
  return (
    <View className="mb-4">
      <Pressable
        onPress={onPress}
        disabled={isChecking}
        className={`rounded-xl bg-blue-500 px-6 py-4 ${
          isChecking ? 'opacity-60' : 'active:bg-blue-600'
        }`}
      >
        <Text className="text-center text-lg font-semibold text-white">
          Grant Notification Access
        </Text>
      </Pressable>
      
      <Pressable
        onPress={onRecheck}
        disabled={isChecking}
        className="mt-2 py-2"
      >
        <Text className="text-center text-sm text-blue-500">
          {isChecking ? 'Checking...' : 'Already granted? Tap to refresh'}
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * Language selection component.
 */
function LanguageSelector({
  currentLanguage,
  onLanguageChange,
}: {
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
}) {
  // Show top 4 languages for quick selection
  const quickLanguages = SUPPORTED_LANGUAGES.slice(0, 4);
  const [showAll, setShowAll] = useState(false);

  const displayLanguages = showAll ? SUPPORTED_LANGUAGES : quickLanguages;

  return (
    <View className="mb-4 rounded-xl bg-white p-5 shadow-sm">
      <Text className="mb-3 text-base font-semibold text-gray-700">
        Announcement Language
      </Text>
      
      <View className="flex-row flex-wrap gap-2">
        {displayLanguages.map((lang) => (
          <Pressable
            key={lang.code}
            onPress={() => onLanguageChange(lang.code)}
            className={`rounded-lg px-4 py-2 ${
              currentLanguage === lang.code
                ? 'bg-blue-500'
                : 'border border-gray-200 bg-gray-50'
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                currentLanguage === lang.code ? 'text-white' : 'text-gray-700'
              }`}
            >
              {lang.nativeName}
            </Text>
          </Pressable>
        ))}
      </View>

      {!showAll && SUPPORTED_LANGUAGES.length > 4 && (
        <Pressable
          onPress={() => setShowAll(true)}
          className="mt-3"
        >
          <Text className="text-sm text-blue-500">
            Show all {SUPPORTED_LANGUAGES.length} languages
          </Text>
        </Pressable>
      )}

      {showAll && (
        <Pressable
          onPress={() => setShowAll(false)}
          className="mt-3"
        >
          <Text className="text-sm text-gray-500">
            Show less
          </Text>
        </Pressable>
      )}
    </View>
  );
}

/**
 * Last notification display card.
 */
function LastNotificationCard({
  notification,
}: {
  notification: ParsedNotification | null;
}) {
  if (!notification) {
    return (
      <View className="mb-4 rounded-xl border-2 border-dashed border-gray-200 bg-white p-6">
        <Text className="text-center text-gray-400 italic">
          Waiting for payment notification...
        </Text>
        <Text className="mt-2 text-center text-xs text-gray-400">
          Payment amounts will be displayed and announced here
        </Text>
      </View>
    );
  }

  const formattedAmount = notification.amount?.toLocaleString('en-IN', {
    minimumFractionDigits: notification.amount % 1 !== 0 ? 2 : 0,
    maximumFractionDigits: 2,
  });

  const timeAgo = getTimeAgo(notification.parsedAt);

  return (
    <View className="mb-4 rounded-xl bg-white p-5 shadow-sm">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-gray-500">Last Payment</Text>
        <Text className="text-xs text-gray-400">{timeAgo}</Text>
      </View>

      <View className="mt-2">
        {notification.amount !== null ? (
          <Text className="text-4xl font-bold text-green-600">
            ₹{formattedAmount}
          </Text>
        ) : (
          <Text className="text-xl text-gray-400">Amount not detected</Text>
        )}
      </View>

      {notification.sender && (
        <Text className="mt-1 text-base text-gray-600">
          from {notification.sender}
        </Text>
      )}

      <View className="mt-3 flex-row items-center">
        <View className="rounded-full bg-gray-100 px-3 py-1">
          <Text className="text-xs text-gray-600">
            via {SOURCE_NAMES[notification.source]}
          </Text>
        </View>

        {!notification.isSuccessful && (
          <View className="ml-2 rounded-full bg-red-100 px-3 py-1">
            <Text className="text-xs text-red-600">Failed/Pending</Text>
          </View>
        )}
      </View>
    </View>
  );
}

/**
 * Test controls component.
 */
function TestControls({
  onTest,
  onStop,
  isTesting,
  language,
}: {
  onTest: () => void;
  onStop: () => void;
  isTesting: boolean;
  language: Language;
}) {
  const langInfo = SUPPORTED_LANGUAGES.find((l) => l.code === language);

  return (
    <View className="mb-4 rounded-xl bg-white p-5 shadow-sm">
      <Text className="mb-3 text-base font-semibold text-gray-700">
        Test Announcement
      </Text>

      <Text className="mb-4 text-sm text-gray-500">
        Test how ₹500 sounds in {langInfo?.englishName || language}
      </Text>

      <View className="flex-row gap-3">
        <Pressable
          onPress={onTest}
          disabled={isTesting}
          className={`flex-1 flex-row items-center justify-center rounded-lg border-2 px-4 py-3 ${
            isTesting
              ? 'border-green-500 bg-green-50'
              : 'border-gray-200 bg-gray-50 active:bg-gray-100'
          }`}
        >
          {isTesting ? (
            <ActivityIndicator size="small" color="#22C55E" />
          ) : (
            <Text className="text-2xl">🔊</Text>
          )}
          <Text
            className={`ml-2 font-medium ${
              isTesting ? 'text-green-600' : 'text-gray-700'
            }`}
          >
            {isTesting ? 'Playing...' : 'Test TTS'}
          </Text>
        </Pressable>

        <Pressable
          onPress={onStop}
          className="rounded-lg border-2 border-gray-200 bg-gray-50 px-4 py-3 active:bg-gray-100"
        >
          <Text className="text-2xl">⏹️</Text>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Help/instructions section.
 */
function HelpSection() {
  return (
    <View className="rounded-xl bg-blue-50 p-5">
      <Text className="mb-3 text-base font-semibold text-blue-800">
        How to use
      </Text>

      <View className="space-y-2">
        <HelpItem number={1} text="Grant notification access above" />
        <HelpItem number={2} text="Receive a UPI payment (PhonePe, GPay, Paytm, BHIM)" />
        <HelpItem number={3} text="Hear the amount announced automatically" />
      </View>

      <Text className="mt-4 text-xs text-blue-600">
        💡 Keep the app running in the background for continuous monitoring
      </Text>
    </View>
  );
}

/**
 * Help item component.
 */
function HelpItem({ number, text }: { number: number; text: string }) {
  return (
    <View className="flex-row items-start">
      <View className="mr-3 h-6 w-6 items-center justify-center rounded-full bg-blue-200">
        <Text className="text-xs font-bold text-blue-800">{number}</Text>
      </View>
      <Text className="flex-1 text-sm text-blue-700">{text}</Text>
    </View>
  );
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Formats a timestamp as a relative time string.
 */
function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
