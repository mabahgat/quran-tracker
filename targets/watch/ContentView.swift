import SwiftUI

struct ContentView: View {
    @ObservedObject var manager: ConnectivityManager
    @State private var showPartial = false
    @State private var justLogged = false

    private var snapshot: WatchSnapshot { manager.snapshot }
    private var strings: WatchStrings { WatchStrings.of(snapshot.language) }

    var body: some View {
        Group {
            if snapshot.hasPlan {
                glance
            } else {
                noPlan
            }
        }
        .environment(\.layoutDirection, snapshot.language == "ar" ? .rightToLeft : .leftToRight)
        .sheet(isPresented: $showPartial) {
            PartialView(manager: manager, strings: strings, maxVerses: max(snapshot.dailyGoal, 1))
        }
    }

    private var noPlan: some View {
        VStack(spacing: 8) {
            Text(strings.noPlanTitle).font(.headline)
            Text(strings.noPlanBody)
                .font(.footnote)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
    }

    private var glance: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 10) {
                Text(snapshot.planName).font(.headline).lineLimit(2)

                row(strings.goal, snapshot.goalLabel)
                if !snapshot.upToLabel.isEmpty {
                    row("→", snapshot.upToLabel)
                }
                if !snapshot.positionLabel.isEmpty {
                    row(strings.today, snapshot.positionLabel)
                }

                VStack(alignment: .leading, spacing: 4) {
                    ProgressView(value: Double(snapshot.percent), total: 100)
                        .tint(Color("brand"))
                    Text("\(strings.progress) · \(snapshot.percent)%")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }

                if !snapshot.projectionLabel.isEmpty {
                    Text(snapshot.projectionLabel)
                        .font(.caption2)
                        .foregroundStyle(Color("brand"))
                }

                if justLogged || !snapshot.statusLabel.isEmpty {
                    Text(justLogged ? strings.loggedToday : "\(strings.loggedToday): \(snapshot.statusLabel)")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }

                actions
            }
            .padding(.horizontal, 4)
        }
    }

    private var actions: some View {
        VStack(spacing: 6) {
            Button(action: { log("full") }) {
                Text(strings.full).frame(maxWidth: .infinity)
            }
            .tint(Color("brand"))

            Button(action: { showPartial = true }) {
                Text(strings.partial).frame(maxWidth: .infinity)
            }

            Button(action: { log("missed") }) {
                Text(strings.missed).frame(maxWidth: .infinity)
            }
            .tint(.gray)
        }
        .buttonStyle(.borderedProminent)
        .padding(.top, 4)
    }

    private func row(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label).font(.caption2).foregroundStyle(.secondary)
            Spacer()
            Text(value).font(.caption).lineLimit(1)
        }
    }

    private func log(_ status: String) {
        manager.sendLog(status: status, verses: 0)
        withAnimation { justLogged = true }
    }
}

/// A simple Digital-Crown-friendly counter for entering a partial verse count.
struct PartialView: View {
    @ObservedObject var manager: ConnectivityManager
    let strings: WatchStrings
    let maxVerses: Int
    @Environment(\.dismiss) private var dismiss
    @State private var verses = 1

    var body: some View {
        VStack(spacing: 12) {
            Text(strings.partial).font(.headline)
            Stepper(value: $verses, in: 1...max(maxVerses, 600)) {
                Text("\(verses) \(strings.verses)")
            }
            HStack {
                Button(strings.cancel) { dismiss() }
                Button(strings.save) {
                    manager.sendLog(status: "partial", verses: verses)
                    dismiss()
                }
                .tint(Color("brand"))
            }
        }
        .padding()
    }
}
