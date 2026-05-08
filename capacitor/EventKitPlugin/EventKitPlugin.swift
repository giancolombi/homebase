import Foundation
import Capacitor
import EventKit

// EventKit bridge for Homebase iOS.
//
// Replaces the web app's CalDAV-with-app-specific-password flow on iOS.
// We read the user's device Calendar.app (which already aggregates iCloud,
// Google, Outlook, Exchange, and any other accounts the user has added in
// Settings → Calendar → Accounts) and ship a normalized event batch to the
// Homebase API at /api/calendar/eventkit/sync. Other family members see the
// iOS user's events without each having to connect those calendars
// independently.
//
// Permission model: requestFullAccessToEvents on iOS 17+, requestAccess(to:)
// on older iOS. Both surface the same single OS-level prompt — the rationale
// shown to the user comes from NSCalendarsUsageDescription in Info.plist.
//
// Change observation: we hold a single store-level observer for
// EKEventStoreChanged. The JS side calls observeChanges() once at app boot
// and re-fetches events when notified.

@objc(EventKitPlugin)
public class EventKitPlugin: CAPPlugin {
    private let store = EKEventStore()
    private var changeObserver: NSObjectProtocol?

    @objc func requestAccess(_ call: CAPPluginCall) {
        let completion: (Bool, Error?) -> Void = { granted, error in
            if let error = error {
                call.reject("Access request failed", nil, error)
                return
            }
            call.resolve(["granted": granted])
        }

        if #available(iOS 17.0, *) {
            store.requestFullAccessToEvents(completion: completion)
        } else {
            store.requestAccess(to: .event, completion: completion)
        }
    }

    @objc func currentAuthorizationStatus(_ call: CAPPluginCall) {
        let status: EKAuthorizationStatus
        if #available(iOS 17.0, *) {
            status = EKEventStore.authorizationStatus(for: .event)
        } else {
            status = EKEventStore.authorizationStatus(for: .event)
        }
        call.resolve(["status": stringForStatus(status)])
    }

    @objc func listCalendars(_ call: CAPPluginCall) {
        let calendars = store.calendars(for: .event).map { cal -> [String: Any] in
            return [
                "id": cal.calendarIdentifier,
                "title": cal.title,
                "sourceTitle": cal.source.title,
                "color": cal.cgColor.map { hexFor($0) } ?? "",
                "allowsModifications": cal.allowsContentModifications,
            ]
        }
        call.resolve(["calendars": calendars])
    }

    @objc func fetchEvents(_ call: CAPPluginCall) {
        // JS Date.toISOString() always includes fractional seconds
        // ("...T00:00:00.000Z"). Default ISO8601DateFormatter rejects
        // those — opt into .withFractionalSeconds so both the no-frac and
        // millis variants parse.
        let parser = ISO8601DateFormatter()
        parser.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let parserNoFrac = ISO8601DateFormatter()
        parserNoFrac.formatOptions = [.withInternetDateTime]

        func parse(_ s: String?) -> Date? {
            guard let s = s else { return nil }
            return parser.date(from: s) ?? parserNoFrac.date(from: s)
        }

        guard let startDate = parse(call.getString("timeMin")),
              let endDate = parse(call.getString("timeMax")) else {
            call.reject("timeMin and timeMax (ISO 8601) are required")
            return
        }

        let predicate = store.predicateForEvents(
            withStart: startDate,
            end: endDate,
            calendars: nil
        )
        let events = store.events(matching: predicate).map { ev -> [String: Any] in
            let formatter = ISO8601DateFormatter()
            return [
                "externalId": ev.eventIdentifier ?? UUID().uuidString,
                "title": ev.title ?? "Untitled",
                "description": ev.notes ?? NSNull(),
                "date": dateString(ev.startDate),
                "startTime": ev.isAllDay ? NSNull() : timeString(ev.startDate),
                "endTime": ev.isAllDay ? NSNull() : timeString(ev.endDate),
                "allDay": ev.isAllDay,
                "location": ev.location ?? NSNull(),
                "sourceTitle": ev.calendar?.source.title ?? NSNull(),
                "calendarTitle": ev.calendar?.title ?? NSNull(),
                "startISO": formatter.string(from: ev.startDate),
                "endISO": formatter.string(from: ev.endDate),
            ]
        }
        call.resolve(["events": events])
    }

    @objc func observeChanges(_ call: CAPPluginCall) {
        if let existing = changeObserver {
            NotificationCenter.default.removeObserver(existing)
        }
        changeObserver = NotificationCenter.default.addObserver(
            forName: .EKEventStoreChanged,
            object: store,
            queue: .main
        ) { [weak self] _ in
            self?.notifyListeners("eventStoreChanged", data: [:])
        }
        call.resolve(["ok": true])
    }

    @objc func stopObserving(_ call: CAPPluginCall) {
        if let observer = changeObserver {
            NotificationCenter.default.removeObserver(observer)
            changeObserver = nil
        }
        call.resolve(["ok": true])
    }

    deinit {
        if let observer = changeObserver {
            NotificationCenter.default.removeObserver(observer)
        }
    }

    // MARK: - Helpers

    private func stringForStatus(_ status: EKAuthorizationStatus) -> String {
        switch status {
        case .notDetermined: return "notDetermined"
        case .restricted: return "restricted"
        case .denied: return "denied"
        case .authorized: return "authorized"
        case .fullAccess: return "fullAccess"
        case .writeOnly: return "writeOnly"
        @unknown default: return "unknown"
        }
    }

    private func dateString(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = TimeZone.current
        return formatter.string(from: date)
    }

    private func timeString(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        formatter.timeZone = TimeZone.current
        return formatter.string(from: date)
    }

    private func hexFor(_ color: CGColor) -> String {
        guard let components = color.components, components.count >= 3 else { return "" }
        let r = Int(components[0] * 255)
        let g = Int(components[1] * 255)
        let b = Int(components[2] * 255)
        return String(format: "#%02X%02X%02X", r, g, b)
    }
}
