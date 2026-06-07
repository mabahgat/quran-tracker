import SwiftUI

@main
struct QuranTrackerWatchApp: App {
    @StateObject private var manager = ConnectivityManager()

    var body: some Scene {
        WindowGroup {
            ContentView(manager: manager)
        }
    }
}
