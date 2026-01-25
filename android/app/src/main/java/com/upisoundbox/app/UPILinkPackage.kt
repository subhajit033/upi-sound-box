package com.upisoundbox.app

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * React Native Package that registers the UPILinkModule.
 * 
 * This package is registered in MainApplication to expose
 * the native module to JavaScript.
 */
class UPILinkPackage : ReactPackage {

    /**
     * Creates the list of native modules to register.
     * 
     * @param reactContext The React application context
     * @return List containing the UPILinkModule
     */
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(UPILinkModule(reactContext))
    }

    /**
     * Creates the list of view managers to register.
     * 
     * This app has no custom native UI components, so we return an empty list.
     * 
     * @param reactContext The React application context
     * @return Empty list (no custom views)
     */
    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
