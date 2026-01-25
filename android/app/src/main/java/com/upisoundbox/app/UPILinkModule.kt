package com.upisoundbox.app

import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.provider.Settings
import android.text.TextUtils
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray

/**
 * React Native bridge module for UPI Soundbox functionality.
 * Provides methods to check and manage notification listener permissions,
 * and query installed UPI apps.
 */
class UPILinkModule(reactContext: ReactApplicationContext) : 
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        // Module name exposed to React Native
        private const val MODULE_NAME = "UPILinkModule"
        
        // Error codes for promise rejections
        private const val ERROR_CODE_GENERIC = "ERROR"
        private const val ERROR_CODE_ACTIVITY = "ACTIVITY_ERROR"
        private const val ERROR_CODE_PERMISSION = "PERMISSION_ERROR"
        
        // Supported UPI payment app package names
        private val UPI_PACKAGES: List<String> = listOf(
            "com.phonepe.app",                           // PhonePe
            "com.google.android.apps.nbu.paisa.user",    // Google Pay
            "net.one97.paytm",                           // Paytm
            "in.org.npci.upiapp"                         // BHIM
        )
        
        // Human-readable names for UPI apps
        private val UPI_APP_NAMES: Map<String, String> = mapOf(
            "com.phonepe.app" to "PhonePe",
            "com.google.android.apps.nbu.paisa.user" to "Google Pay",
            "net.one97.paytm" to "Paytm",
            "in.org.npci.upiapp" to "BHIM"
        )
    }

    /**
     * Returns the name of this module for React Native.
     */
    override fun getName(): String = MODULE_NAME

    /**
     * Checks if the notification listener service is enabled for this app.
     * 
     * This reads the system setting that contains a colon-separated list
     * of enabled notification listener components and checks if our app
     * is in that list.
     * 
     * @param promise Resolves with true if enabled, false otherwise
     */
    @ReactMethod
    fun isNotificationServiceEnabled(promise: Promise) {
        try {
            val context = reactApplicationContext
            val packageName = context.packageName
            
            // Get the list of enabled notification listeners from system settings
            val enabledListeners = Settings.Secure.getString(
                context.contentResolver,
                "enabled_notification_listeners"
            )
            
            // If no listeners are enabled, our app definitely isn't enabled
            if (TextUtils.isEmpty(enabledListeners)) {
                promise.resolve(false)
                return
            }
            
            // Parse the colon-separated list of ComponentName strings
            val components = enabledListeners.split(":")
            
            for (component in components) {
                // Parse each component string to a ComponentName object
                val componentName = ComponentName.unflattenFromString(component)
                
                // Check if this component belongs to our app
                if (componentName != null && componentName.packageName == packageName) {
                    promise.resolve(true)
                    return
                }
            }
            
            // Our app was not found in the enabled listeners
            promise.resolve(false)
            
        } catch (e: Exception) {
            promise.reject(ERROR_CODE_PERMISSION, "Failed to check notification service status: ${e.message}", e)
        }
    }

    /**
     * Opens the system notification listener settings screen.
     * 
     * This allows the user to enable notification access for this app.
     * 
     * @param promise Resolves with true if settings opened successfully
     */
    @ReactMethod
    fun openNotificationSettings(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
                // Required flag since we're starting activity from non-activity context
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
            
        } catch (e: Exception) {
            promise.reject(ERROR_CODE_ACTIVITY, "Failed to open notification settings: ${e.message}", e)
        }
    }

    /**
     * Gets the list of installed UPI payment apps on the device.
     * 
     * This helps the user understand which apps will be monitored
     * for payment notifications.
     * 
     * @param promise Resolves with an array of objects containing package names and app names
     */
    @ReactMethod
    fun getInstalledUPIApps(promise: Promise) {
        try {
            val packageManager = reactApplicationContext.packageManager
            val installedApps: WritableArray = Arguments.createArray()
            
            for (packageName in UPI_PACKAGES) {
                if (isPackageInstalled(packageManager, packageName)) {
                    val appInfo = Arguments.createMap().apply {
                        putString("packageName", packageName)
                        putString("appName", UPI_APP_NAMES[packageName] ?: packageName)
                    }
                    installedApps.pushMap(appInfo)
                }
            }
            
            promise.resolve(installedApps)
            
        } catch (e: Exception) {
            promise.reject(ERROR_CODE_GENERIC, "Failed to get installed UPI apps: ${e.message}", e)
        }
    }

    /**
     * Checks if a package is installed on the device.
     * 
     * @param packageManager The PackageManager instance
     * @param packageName The package name to check
     * @return true if installed, false otherwise
     */
    private fun isPackageInstalled(packageManager: PackageManager, packageName: String): Boolean {
        return try {
            // Using MATCH_ALL flag for Android 13+ compatibility
            packageManager.getPackageInfo(packageName, PackageManager.MATCH_ALL)
            true
        } catch (e: PackageManager.NameNotFoundException) {
            false
        }
    }

    /**
     * Gets all supported UPI app package names.
     * 
     * This is useful for displaying the list of apps that can be monitored.
     * 
     * @param promise Resolves with an array of objects containing all supported UPI apps
     */
    @ReactMethod
    fun getSupportedUPIApps(promise: Promise) {
        try {
            val supportedApps: WritableArray = Arguments.createArray()
            
            for (packageName in UPI_PACKAGES) {
                val appInfo = Arguments.createMap().apply {
                    putString("packageName", packageName)
                    putString("appName", UPI_APP_NAMES[packageName] ?: packageName)
                }
                supportedApps.pushMap(appInfo)
            }
            
            promise.resolve(supportedApps)
            
        } catch (e: Exception) {
            promise.reject(ERROR_CODE_GENERIC, "Failed to get supported UPI apps: ${e.message}", e)
        }
    }
}
