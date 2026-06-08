import SwiftUI

struct ContentView: View {
    @ObservedObject var manager: ConnectivityManager
    @State private var selection = 0
    @State private var didInit = false

    private var payload: WatchPayload { manager.payload }
    private var strings: WatchStrings { WatchStrings.of(payload.language) }

    var body: some View {
        Group {
            if payload.hasPlan && !payload.plans.isEmpty {
                TabView(selection: $selection) {
                    ForEach(Array(payload.plans.enumerated()), id: \.element.id) { index, plan in
                        PlanGlance(plan: plan, strings: strings, manager: manager)
                            .tag(index)
                    }
                }
                .tabViewStyle(.page)
            } else {
                noPlan
            }
        }
        .environment(\.layoutDirection, payload.language == "ar" ? .rightToLeft : .leftToRight)
        .onAppear {
            // Open on the default plan the first time the payload arrives.
            if !didInit && !payload.plans.isEmpty {
                selection = min(max(payload.defaultIndex, 0), payload.plans.count - 1)
                didInit = true
            }
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
}

/// A single plan's glance plus log actions. One per page in the TabView.
struct PlanGlance: View {
    let plan: WatchPlanEntry
    let strings: WatchStrings
    @ObservedObject var manager: ConnectivityManager
    @State private var showPartial = false
    @State private var justLogged = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Text(plan.planName).font(.headline).lineLimit(2)
                    if plan.isDefault {
                        Spacer()
                        Text(strings.defaultTag)
                            .font(.caption2)
                            .foregroundStyle(Color("brand"))
                    }
                }

                row(strings.goal, plan.goalLabel)
                if !plan.upToLabel.isEmpty {
                    row("→", plan.upToLabel)
                }
                if !plan.positionLabel.isEmpty {
                    row(strings.today, plan.positionLabel)
                }

                VStack(alignment: .leading, spacing: 4) {
                    ProgressView(value: Double(plan.percent), total: 100)
                        .tint(Color("brand"))
                    Text("\(strings.progress) · \(plan.percent)%")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }

                if !plan.projectionLabel.isEmpty {
                    Text(plan.projectionLabel)
                        .font(.caption2)
                        .foregroundStyle(Color("brand"))
                }

                if justLogged || !plan.statusLabel.isEmpty {
                    Text(justLogged ? strings.loggedToday : "\(strings.loggedToday): \(plan.statusLabel)")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }

                actions
            }
            .padding(.horizontal, 4)
        }
        .sheet(isPresented: $showPartial) {
            PartialView(manager: manager, strings: strings, planId: plan.id, maxVerses: max(plan.dailyGoal, 1))
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
        manager.sendLog(planId: plan.id, status: status, verses: 0)
        withAnimation { justLogged = true }
    }
}

/// A simple Digital-Crown-friendly counter for entering a partial verse count.
struct PartialView: View {
    @ObservedObject var manager: ConnectivityManager
    let strings: WatchStrings
    let planId: String
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
                    manager.sendLog(planId: planId, status: "partial", verses: verses)
                    dismiss()
                }
                .tint(Color("brand"))
            }
        }
        .padding()
    }
}
