import Foundation
import WatchConnectivity

/// Owns the watch side of the WatchConnectivity session: it receives the latest
/// payload (all of the user's plans) from the phone and sends the user's log
/// actions back, tagged with the plan they target. The last payload is cached in
/// UserDefaults so the glance shows something immediately on launch.
final class ConnectivityManager: NSObject, ObservableObject, WCSessionDelegate {
    @Published var payload = WatchPayload()

    private let storeKey = "lastPayload"

    override init() {
        super.init()
        if let data = UserDefaults.standard.data(forKey: storeKey),
           let cached = try? JSONDecoder().decode(WatchPayload.self, from: data) {
            payload = cached
        }
        if WCSession.isSupported() {
            WCSession.default.delegate = self
            WCSession.default.activate()
        }
    }

    // MARK: - WCSessionDelegate

    func session(_ session: WCSession,
                 activationDidCompleteWith activationState: WCSessionActivationState,
                 error: Error?) {
        let context = session.receivedApplicationContext
        if !context.isEmpty {
            apply(context)
        }
    }

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        apply(applicationContext)
    }

    // Required by WCSessionDelegate when this type is compiled for iOS (e.g. while
    // the watch app is embedded during an iOS app build). Excluded on watchOS.
    #if os(iOS)
    func sessionDidBecomeInactive(_ session: WCSession) {}

    func sessionDidDeactivate(_ session: WCSession) {
        WCSession.default.activate()
    }
    #endif

    // MARK: - Outgoing log actions

    /// Sends a log action for a specific plan to the phone. Uses `transferUserInfo`
    /// so the action is queued and delivered even if the phone is not reachable.
    func sendLog(planId: String, status: String, verses: Int) {
        guard WCSession.isSupported() else { return }
        let payload: [String: Any] = [
            "type": "log",
            "planId": planId,
            "status": status,
            "verses": verses,
        ]
        WCSession.default.transferUserInfo(payload)
    }

    // MARK: - Helpers

    private func apply(_ context: [String: Any]) {
        guard let next = WatchPayload.from(context) else { return }
        DispatchQueue.main.async {
            self.payload = next
            if let data = try? JSONEncoder().encode(next) {
                UserDefaults.standard.set(data, forKey: self.storeKey)
            }
        }
    }
}
