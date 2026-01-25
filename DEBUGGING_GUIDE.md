# UPI Soundbox - Debugging Guide

## Testing Notification Listener

### 1. Check if Notification Access is Granted

1. Open the UPI Soundbox app
2. Look at the status card at the top
3. It should show "Notification Access: Granted"
4. If not granted, tap "Grant Notification Access" button
5. Enable notification access for "UPI Soundbox"

### 2. Check App Logs

Open a new terminal and run:

```bash
adb logcat UPINotificationListener:D ReactNativeJS:D AndroidRuntime:E *:S
```

You should see:

- `Setting up notification listener...` when app opens
- `Notification listener set up successfully` after setup
- `Notification listener connected` when service connects

### 3. Test with Google Pay Payment

When you receive a payment:

**Expected behavior:**

1. A toast notification will appear saying "UPI Notification: com.google.android.apps.nbu.paisa.user"
2. App logs will show:
   ```
   Notification from: com.google.android.apps.nbu.paisa.user
   Processing UPI Notification - Package: com.google.android.apps.nbu.paisa.user
   Title: [payment title]
   Text: [payment text]
   ```
3. The app should speak the amount in your selected language
4. The status card should update with the last received amount

### 4. Common Issues & Solutions

#### Issue: No toast appears when payment is received

**Solution 1: Check if notification listener service is running**

```bash
adb shell dumpsys notification | grep "com.upisoundbox.app"
```

You should see `com.upisoundbox.app/com.upisoundbox.app.UPINotificationListener` in the output.

**Solution 2: Force stop and restart the app**

```bash
adb shell am force-stop com.upisoundbox.app
```

Then reopen the app from your phone.

**Solution 3: Reboot the phone**
Sometimes Android needs a reboot for NotificationListenerService changes to take effect.

#### Issue: Toast appears but no audio/TTS

**Check:**

1. Phone is not on silent mode
2. Media volume is turned up
3. Check React Native logs for errors:
   ```bash
   adb logcat ReactNativeJS:D *:S
   ```

#### Issue: App receives notification but doesn't parse amount correctly

**Debug:**

1. Check the logs for "Title:" and "Text:" - these show what the app received
2. The notification text format may have changed
3. You may need to update the regex patterns in `src/utils/notificationParser.ts`

### 5. Manual Testing Steps

1. **Open the app** - You should see the main screen
2. **Check permission** - Ensure "Notification Access: Granted"
3. **Test TTS** - Tap "Test TTS" button at bottom, should hear "Received rupees five hundred"
4. **Send test payment** - Ask a friend to send ₹1 via Google Pay
5. **Watch for:**
   - Toast notification on screen
   - Audio announcement
   - Status card updates with received amount

### 6. Logcat Filters

Use these filters to debug specific issues:

**All UPI logs:**

```bash
adb logcat | grep -i upi
```

**Notification service logs:**

```bash
adb logcat | grep UPINotificationListener
```

**React Native JavaScript logs:**

```bash
adb logcat | grep ReactNativeJS
```

**Crash logs:**

```bash
adb logcat AndroidRuntime:E *:S
```

### 7. Verify Notification Payload

When you receive a payment, check logs for:

```
D/UPINotificationListener: Notification from: com.google.android.apps.nbu.paisa.user
D/UPINotificationListener: Title: Google Pay
D/UPINotificationListener: Text: You received ₹500.00 from John Doe
D/UPINotificationListener: BigText: You received ₹500.00 from John Doe
D/UPINotificationListener: Final text: You received ₹500.00 from John Doe
D/UPINotificationListener: Processing UPI Notification - Package: com.google.android.apps.nbu.paisa.user
D/UPINotificationListener: Attempting to send event to React Native
D/UPINotificationListener: React context available: true
D/UPINotificationListener: Event emitted successfully to React Native
```

Then in React Native:

```
D/ReactNativeJS: Notification received: {"packageName":"com.google.android.apps.nbu.paisa.user","title":"Google Pay","text":"You received ₹500.00...","timestamp":1737820345678}
```

### 8. If Still Not Working

Try these steps in order:

1. **Reinstall the app:**

   ```bash
   adb uninstall com.upisoundbox.app
   npx expo run:android
   ```

2. **Clear app data:**

   ```bash
   adb shell pm clear com.upisoundbox.app
   ```

3. **Revoke and re-grant notification permission:**
   - Settings → Apps → UPI Soundbox → Permissions → Remove notification access
   - Reopen app and grant again

4. **Check if Google Pay notifications are enabled:**
   - Settings → Apps → Google Pay → Notifications
   - Ensure notifications are enabled

5. **Test with a different UPI app:**
   - Try PhonePe or Paytm instead
   - Package names:
     - PhonePe: `com.phonepe.app`
     - Paytm: `net.one97.paytm`
     - BHIM: `in.org.npci.upiapp`

### 9. Expected Notification Format

Different UPI apps have different notification formats:

**Google Pay:**

- Title: "Google Pay"
- Text: "You received ₹X from [Name]"

**PhonePe:**

- Title: "Payment received"
- Text: "You've received ₹X from [Name]"

**Paytm:**

- Title: "Payment Received"
- Text: "₹X received from [Name]"

**BHIM:**
onePe: `com.phonepe.app`
     - Paytm: `net.one97.paytm`
     - BHIM: `in.org.npci.upiapp`

### 9. Expected Notification Format

Different UPI apps have different notification formats:

**Google Pay:**

- Title: "Google Pay"
- Text: "You received ₹X from [Name]"

**PhonePe:**

- Title: "Payment received"
- Text: "You've received ₹X from [Name]"

**Paytm:**

- Title: "Payment Received"
- Text: "₹X received from [Name]"

**BHIM:**

- Title: "Payment Successful"
- Text: "You have received ₹X"

The app should handle all these formats. If it doesn't work for a specific app, check the logs to see what format is received.
