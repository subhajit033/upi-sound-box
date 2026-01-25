package com.upisoundbox.app

import android.app.Application
import android.content.res.Configuration

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.ReactInstanceEventListener
import com.facebook.react.bridge.ReactContext
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader

import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ReactNativeHostWrapper

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost = ReactNativeHostWrapper(
        this,
        object : DefaultReactNativeHost(this) {
          override fun getPackages(): List<ReactPackage> {
            val packages = PackageList(this).packages.toMutableList()
            // Add UPILinkPackage for notification listener bridge
            packages.add(UPILinkPackage())
            return packages
          }

          override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"

          override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

          override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
          override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      }
  )

  override val reactHost: ReactHost
    get() = ReactNativeHostWrapper.createReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    SoLoader.init(this, OpenSourceMergedSoMapping)
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      // If you opted-in for the New Architecture, we load the native entry point for this app.
      load()
    }
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
    
    // Set up React context listener for UPINotificationListener
    setupReactContextListener()
    
    // Periodically check and set React context (fallback for expo-dev-client)
    startContextChecker()
  }
  
  /**
   * Starts a periodic checker to ensure React context is available to notification listener.
   * This is needed because expo-dev-client may not trigger onReactContextInitialized reliably.
   */
  private fun startContextChecker() {
    val handler = android.os.Handler(android.os.Looper.getMainLooper())
    val runnable = object : Runnable {
      override fun run() {
        try {
          val currentContext = reactNativeHost.reactInstanceManager.currentReactContext
          if (currentContext != null && UPINotificationListener.reactContext == null) {
            android.util.Log.d("MainApplication", "✓ React context now available, setting for UPINotificationListener")
            UPINotificationListener.reactContext = currentContext
          } else if (currentContext != null && currentContext != UPINotificationListener.reactContext) {
            android.util.Log.d("MainApplication", "✓ React context changed, updating UPINotificationListener")
            UPINotificationListener.reactContext = currentContext
          }
        } catch (e: Exception) {
          android.util.Log.e("MainApplication", "Error checking React context: ${e.message}")
        }
        // Check again in 2 seconds
        handler.postDelayed(this, 2000)
      }
    }
    // Start checking after 1 second
    handler.postDelayed(runnable, 1000)
  }
  
  /**
   * Sets up a listener to provide React context to the UPINotificationListener.
   * This allows the notification service to emit events to React Native.
   */
  private fun setupReactContextListener() {
    android.util.Log.d("MainApplication", "Setting up React context listener")
    reactNativeHost.reactInstanceManager.addReactInstanceEventListener(
      object : ReactInstanceEventListener {
        override fun onReactContextInitialized(context: ReactContext) {
          android.util.Log.d("MainApplication", "React context initialized! Setting UPINotificationListener context")
          UPINotificationListener.reactContext = context
          android.util.Log.d("MainApplication", "UPINotificationListener.reactContext is now: ${UPINotificationListener.reactContext != null}")
        }
      }
    )
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}
