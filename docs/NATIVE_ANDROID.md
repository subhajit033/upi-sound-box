# UPI Soundbox - Native Android Layer

This document describes the native Android infrastructure for the UPI Soundbox application.

## Architecture Overview

```
android/app/src/main/java/com/upisoundbox/app/
├── MainActivity.kt          # Main activity (auto-generated)
├── MainApplication.kt        # Application class (modified)
├── UPINotificationListener.kt # NotificationListenerService
├── UPILinkModule.kt           # React Native bridge module
└── UPILinkPackage.kt          # React Native package registration
```

## Components

### 1. UPINotificationListener.kt

A `NotificationListenerService` that intercepts notifications from UPI payment apps.

**Features:**
- Filters notifications from PhonePe, Google Pay, Paytm, and BHIM
- Extracts notification title, text, and bigText
- Emits events to React Native via the bridge
- Works even when app is backgrounded or closed
- Gracefully handles cases when React context is unavailable

**Supported UPI Apps:**
| App | Package Name |
|-----|--------------|
| PhonePe | `com.phonepe.app` |
| Google Pay | `com.google.android.apps.nbu.paisa.user` |
| Paytm | `net.one97.paytm` |
| BHIM | `in.org.npci.upiapp` |

### 2. UPILinkModule.kt

React Native bridge module exposing native functionality to JavaScript.

**Methods:**

| Method | Description | Returns |
|--------|-------------|---------|
| `isNotificationServiceEnabled()` | Check if notification access is granted | `Promise<boolean>` |
| `openNotificationSettings()` | Open system notification settings | `Promise<boolean>` |
| `getInstalledUPIApps()` | Get list of installed UPI apps | `Promise<UPIAppInfo[]>` |
| `getSupportedUPIApps()` | Get all supported UPI apps | `Promise<UPIAppInfo[]>` |

### 3. UPILinkPackage.kt

Standard ReactPackage that registers the UPILinkModule.

### 4. MainApplication.kt Modifications

- Registers `UPILinkPackage` in `getPackages()`
- Sets up React context listener for `UPINotificationListener`

## AndroidManifest.xml Configuration

### Permissions
```xml
<!-- Audio/Bluetooth for external speaker -->
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />

<!-- REMOVED: Internet permission (app is fully offline) -->
<uses-permission android:name="android.permission.INTERNET" tools:node="remove"/>
```

### Package Queries (Android 11+)
```xml
<queries>
    <package android:name="com.phonepe.app" />
    <package android:name="com.google.android.apps.nbu.paisa.user" />
    <package android:name="net.one97.paytm" />
    <package android:name="in.org.npci.upiapp" />
</queries>
```

### NotificationListenerService Registration
```xml
<service
    android:name=".UPINotificationListener"
    android:label="UPI Soundbox Listener"
    android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE"
    android:exported="true">
    <intent-filter>
        <action android:name="android.service.notification.NotificationListenerService" />
    </intent-filter>
</service>
```

## Usage from React Native

### TypeScript API

```typescript
import UPILink, { 
  subscribeToUPINotifications,
  isNotificationServiceEnabled,
  openNotificationSettings 
} from '@/modules/UPILink';

// Check if notification access is enabled
const enabled = await isNotificationServiceEnabled();

// Open settings if not enabled
if (!enabled) {
  await openNotificationSettings();
}

// Subscribe to UPI notifications
const subscription = subscribeToUPINotifications((payload) => {
  console.log('App:', payload.packageName);
  console.log('Title:', payload.title);
  console.log('Text:', payload.text);
  console.log('Time:', payload.timestamp);
  
  // Extract amount and trigger TTS...
});

// Cleanup on unmount
subscription?.remove();
```

### Event Payload Structure

```typescript
interface UPINotificationPayload {
  packageName: string;  // e.g., "com.phonepe.app"
  title: string;        // e.g., "Payment Received"
  text: string;         // e.g., "₹500.00 received from John"
  timestamp: number;    // Unix timestamp in ms
}
```

## Testing

### ADB Commands

```bash
# Check if notification service is enabled
adb shell settings get secure enabled_notification_listeners

# Monitor notification listener logs
adb logcat | grep "UPINotificationListener"

# Simulate a test notification
adb shell cmd notification post -S bigtext -t "Payment Received" "TestTag" "₹500 received from Test User"

# Check service registration
adb shell dumpsys notification | grep -i "UPINotificationListener"
```

### Manual Testing Steps

1. **Install the app** on an Android device/emulator
2. **Open the app** and check for permission prompt
3. **Grant notification access** in system settings
4. **Trigger a UPI payment** (or use ADB to simulate)
5. **Verify** the notification is captured and event is emitted

### Success Criteria

- [ ] Service appears in "Notification access" settings
- [ ] UPI app notifications trigger `onNotificationPosted()`
- [ ] Events are emitted to React Native with correct payload
- [ ] App works correctly in background mode
- [ ] No crashes when React context is unavailable

## Troubleshooting

### "Service not found in settings"
- Verify `AndroidManifest.xml` has correct service declaration
- Check `android:permission` attribute is set correctly
- Rebuild the app after manifest changes

### "Module not found" error in JS
- Verify `UPILinkPackage` is added to `MainApplication.kt`
- Run `npx expo prebuild --clean` and rebuild
- Check for Kotlin compilation errors

### "Events not received in JS"
- Ensure React context is initialized (app is running)
- Check logcat for "Event emitted successfully" messages
- Verify the event listener is set up before notifications arrive

### "Permission denied" on Android 13+
- Android 13+ requires runtime notification permission
- Add `POST_NOTIFICATIONS` permission handling in JS layer

## Build Verification

```bash
# Navigate to android folder
cd android

# Clean and build
./gradlew clean assembleDebug

# Check for any Kotlin compilation errors
./gradlew compileDebugKotlin

# Run lint checks
./gradlew lintDebug
```

## File Locations

| File | Path |
|------|------|
| NotificationListener | `android/app/src/main/java/com/upisoundbox/app/UPINotificationListener.kt` |
| Bridge Module | `android/app/src/main/java/com/upisoundbox/app/UPILinkModule.kt` |
| Package | `android/app/src/main/java/com/upisoundbox/app/UPILinkPackage.kt` |
| Application | `android/app/src/main/java/com/upisoundbox/app/MainApplication.kt` |
| Manifest | `android/app/src/main/AndroidManifest.xml` |
| TS Types | `src/types/UPILinkModule.d.ts` |
| TS Module | `src/modules/UPILink.ts` |

## Next Steps (Phase 2)

1. Implement amount extraction parser (regex for ₹X.XX patterns)
2. Add Text-to-Speech integration
3. Build React Native UI for settings
4. Add multi-language support (Hindi, Bengali, etc.)
