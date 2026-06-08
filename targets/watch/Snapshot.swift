import Foundation

/// One plan's compact glance, mirroring the `WatchPlanEntry` TypeScript type.
/// Decoding is tolerant: any missing key falls back to a default.
struct WatchPlanEntry: Codable, Equatable, Identifiable {
    var id: String = ""
    var isDefault: Bool = false
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

    init() {}

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = (try? c.decodeIfPresent(String.self, forKey: .id)) ?? ""
        isDefault = (try? c.decodeIfPresent(Bool.self, forKey: .isDefault)) ?? false
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
    }
}

/// The full payload from the phone, mirroring the `WatchPayload` TypeScript type.
/// Carries every plan so the watch can page between them.
struct WatchPayload: Codable, Equatable {
    var v: Int = 1
    var hasPlan: Bool = false
    var language: String = "en"
    var defaultIndex: Int = 0
    var plans: [WatchPlanEntry] = []
    var updatedAt: String = ""

    init() {}

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        v = (try? c.decodeIfPresent(Int.self, forKey: .v)) ?? 1
        hasPlan = (try? c.decodeIfPresent(Bool.self, forKey: .hasPlan)) ?? false
        language = (try? c.decodeIfPresent(String.self, forKey: .language)) ?? "en"
        defaultIndex = (try? c.decodeIfPresent(Int.self, forKey: .defaultIndex)) ?? 0
        plans = (try? c.decodeIfPresent([WatchPlanEntry].self, forKey: .plans)) ?? []
        updatedAt = (try? c.decodeIfPresent(String.self, forKey: .updatedAt)) ?? ""
    }

    /// Builds a payload from a WatchConnectivity application-context dictionary.
    /// Only the multi-plan schema is accepted: the context must carry a `plans`
    /// array. This rejects empty or stale/old-format contexts so they can never
    /// overwrite a good cached payload with a degenerate (zero-plan) one.
    static func from(_ context: [String: Any]) -> WatchPayload? {
        guard context["plans"] is [Any] else { return nil }
        guard JSONSerialization.isValidJSONObject(context),
              let data = try? JSONSerialization.data(withJSONObject: context),
              let payload = try? JSONDecoder().decode(WatchPayload.self, from: data)
        else { return nil }
        return payload
    }
}
