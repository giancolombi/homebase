#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Capacitor plugin registration. Required so the JS bridge can find the
// plugin by name. The class name here must match @objc(EventKitPlugin) in
// EventKitPlugin.swift.
CAP_PLUGIN(EventKitPlugin, "EventKit",
    CAP_PLUGIN_METHOD(requestAccess, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(currentAuthorizationStatus, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(listCalendars, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(fetchEvents, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(observeChanges, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(stopObserving, CAPPluginReturnPromise);
)
