package com.upisoundbox.app

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * NotificationListenerService that intercepts UPI payment notifications
 * from supported payment apps and forwards them to React Native.
 * 
 * This service runs independently of the app lifecycle and can receive
 * notifications even when the app is backgrounded or closed.
 */
class UPINotificationListener : NotificationListenerService() {

    companion object {
        // Tag for logging - only used in debug builds
        private const val TAG = "UPINotificationListener"
        
        // Event name for React Native bridge communication
        private const val EVENT_NAME = "onUPIMessageReceived"
        
        // Supported UPI payment app package names
        private val UPI_PACKAGES: Set<String> = setOf(
            "com.phonepe.app",                           // PhonePe
            "com.google.android.apps.nbu.paisa.user",    // Google Pay
            "net.one97.paytm",                           // Paytm
            "in.org.npci.upiapp"                         // BHIM
        )
        
        // Reference to React context for event emission
        // This is set by the MainApplication when React Native initializes
        @Volatile
        var reactContext: ReactContext? = null
    }

    /**
     * Called when a new notification is posted to the system.
     * Filters for UPI app notifications and extracts payment information.
     */
    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        // Early return if notification is null
        if (sbn == null) return
        
        val packageName = sbn.packageName ?: return
        
        // Only process notifications from UPI apps
        if (!UPI_PACKAGES.contains(packageName)) return
        
        try {
            val notification = sbn.notification ?: return
            val extras = notification.extras ?: return
            
            // Extract notification content with null safety
            val title = extras.getCharSequence("android.title")?.toString() ?: ""
            val text = extras.getCharSequence("android.text")?.toString() ?: ""
            
            // Prefer bigText for longer notification content (contains full amount details)
            val bigText = extras.getCharSequence("android.bigText")?.toString() ?: text
            
            // Use the most detailed text available
            val notificationText = if (bigText.isNotEmpty()) bigText else text
            
            // Skip empty notifications
            if (title.isEmpty() && notificationText.isEmpty()) return
            
            logDebug("UPI Notification - Package: $packageName, Title: $title")
            
            // Send event to React Native
            sendEventToReactNative(packageName, title, notificationText)
            
        } catch (e: Exception) {
            logDebug("Error processing notification: ${e.message}")
        }
    }

    /**
     * Called when a notification is removed from the system.
     * Not needed for UPI Soundbox functionality.
     */
    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        // No action needed when notifications are removed
    }

    /**
     * Sends the notification data to React Native via the bridge.
     * Handles cases where React context is not available.
     * 
     * @param packageName The package name of the UPI app
     * @param title The notification title
     * @param text The notification body text
     */
    private fun sendEventToReactNative(packageName: String, title: String, text: String) {
        try {
            val context = reactContext
            
            // Check if React Native is initialized and has active catalyst instance
            if (context == null || !context.hasActiveReactInstance()) {
                logDebug("React context not available - app may not be running")
                return
            }
            
            // Build the payload map
            val payload = Arguments.createMap().apply {
                putString("packageName", packageName)
                putString("title", title)
                putString("text", text)
                putDouble("timestamp", System.currentTimeMillis().toDouble())
            }
            
            // Emit event to JavaScript
            context
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit(EVENT_NAME, payload)
            
            logDebug("Event emitted successfully to React Native")
            
        } catch (e: Exception) {
            // Fail silently - React Native might not be running
            logDebug("Failed to emit event: ${e.message}")
        }
    }

    /**
     * Logs debug messages only in debug builds.
     * 
     * @param message The message to log
     */
    private fun logDebug(message: String) {
        if (BuildConfig.DEBUG) {
            Log.d(TAG, message)
        }
    }

    /**
     * Called when the listener is connected to the notification service.
     */
    override fun onListenerConnected() {
        super.onListenerConnected()
        logDebug("Notification listener connected")
    }

    /**
     * Called when the listener is disconnected from the notification service.
     */
    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        logDebug("Notification listener disconnected")
    }
}
