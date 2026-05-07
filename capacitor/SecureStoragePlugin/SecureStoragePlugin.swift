import Foundation
import Capacitor
import Security

// Keychain-backed key/value store for the iOS Capacitor build.
//
// Used by app/lib/secureStorage.ts to swap the auth-token storage from
// localStorage (in-WebView, cleared under iOS storage pressure) to the
// system Keychain (Secure Enclave-backed where available, persists across
// app reinstall by default — we explicitly DO NOT set
// kSecAttrAccessible to ...ThisDeviceOnlyAfterFirstUnlock so the token
// survives keychain restore from iCloud, matching Mail/Safari behavior).
//
// The service identifier scopes entries to this app — uninstalling
// Homebase wipes them. The accessibility class is
// kSecAttrAccessibleAfterFirstUnlock so background sync (push, EventKit)
// can read the token after device reboot without requiring face/touch ID.

@objc(SecureStoragePlugin)
public class SecureStoragePlugin: CAPPlugin {
    private let service = "dev.gethomebase.app.tokens"

    @objc func get(_ call: CAPPluginCall) {
        guard let key = call.getString("key") else {
            call.reject("key is required")
            return
        }
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        if status == errSecItemNotFound {
            call.resolve(["value": NSNull()])
            return
        }
        guard status == errSecSuccess,
              let data = item as? Data,
              let value = String(data: data, encoding: .utf8) else {
            call.reject("Keychain read failed (\(status))")
            return
        }
        call.resolve(["value": value])
    }

    @objc func set(_ call: CAPPluginCall) {
        guard let key = call.getString("key"),
              let value = call.getString("value"),
              let data = value.data(using: .utf8) else {
            call.reject("key and value (string) are required")
            return
        }
        // Delete-then-add is the simple, reliable way to upsert in the
        // Keychain. The alternative is SecItemUpdate after a SecItemCopy,
        // which is more code for the same outcome.
        let baseQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]
        SecItemDelete(baseQuery as CFDictionary)

        var addQuery = baseQuery
        addQuery[kSecValueData as String] = data
        addQuery[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
        let status = SecItemAdd(addQuery as CFDictionary, nil)
        if status != errSecSuccess {
            call.reject("Keychain write failed (\(status))")
            return
        }
        call.resolve(["ok": true])
    }

    @objc func remove(_ call: CAPPluginCall) {
        guard let key = call.getString("key") else {
            call.reject("key is required")
            return
        }
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]
        let status = SecItemDelete(query as CFDictionary)
        if status != errSecSuccess && status != errSecItemNotFound {
            call.reject("Keychain delete failed (\(status))")
            return
        }
        call.resolve(["ok": true])
    }
}
