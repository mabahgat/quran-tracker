import Foundation

/// Mirrors the `WatchSnapshot` TypeScript type sent by the phone over
/// WatchConnectivity. Decoding is tolerant: any missing key falls back to a
/// default so a partial/older payload never fails to render.
struct WatchSnapshot: Codable, Equatable {
    var v: Int = 1
    var hasPlan: Bool = false
    var planName: String = ""
    var dailyGoal: Int = 0
    var goalLabel: String = ""
    var upToLabel: String = ""
    var positionLabel: String = ""
    var percent: Int = 0
    var todayStatus: String = ""
    var statusLabel: String = ""
    var projectionLabel: String = ""
    var isComplete: Bool = false
    var language: String = "en"
    var updatedAt: String = ""

    init() {}

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        v = (try? c.decodeIfPresent(Int.self, forKey: .v)) ?? 1
        hasPlan = (try? c.decodeIfPresent(Bool.self, forKey: .hasPlan)) ?? false
        planName = (try? c.decodeIfPresent(String.self, forKey: .planName)) ?? ""
        dailyGoal = (try? c.decodeIfPresent(Int.self, forKey: .dailyGoal)) ?? 0
        goalLabel = (try? c.decodeIfPresent(String.self, forKey: .goalLabel)) ?? ""
        upToLabel = (try? c.decodeIfPresent(String.self, forKey: .upToLabel)) ?? ""
        positionLabel = (try? c.decodeIfPresent(String.self, forKey: .positionLabel)) ?? ""
        percent = (try? c.decodeIfPresent(Int.self, forKey: .percent)) ?? 0
        todayStatus = (try? c.decodeIfPresent(String.self, forKey: .todayStatus)) ?? ""
        statusLabel = (try? c.decodeIfPresent(String.self, forKey: .statusLabel)) ?? ""
        projectionLabel = (try? c.decodeIfPresent(String.self, forKey: .projectionLabel)) ?? ""
        isComplete = (try? c.decodeIfPresent(Bool.self, forKey: .isComplete)) ?? false
        language = (try? c.decodeIfPresent(String.self, forKey: .language)) ?? "en"
        updatedAt = (try? c.decodeIfPresent(String.self, forKey: .updatedAt)) ?? ""
    }

    /// Builds a snapshot from a WatchConnectivity application-context dictionary.
    static func from(_ context: [String: Any]) -> WatchSnapshot? {
        guard JSONSerialization.isValidJSONObject(context),
              let data = try? JSONSerialization.data(withJSONObject: context),
              let snapshot = try? JSONDecoder().decode(WatchSnapshot.self, from: data)
        else { return nil }
        return snapshot
    }
}
