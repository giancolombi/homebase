#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(SecureStoragePlugin, "SecureStorage",
    CAP_PLUGIN_METHOD(get, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(set, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(remove, CAPPluginReturnPromise);
)
