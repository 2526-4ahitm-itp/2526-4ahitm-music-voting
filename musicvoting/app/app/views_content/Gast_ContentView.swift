//
//  Gast_ContentView.swift
//  app
//
//  Created by Simone Sperrer on 19.03.26.
//

import SwiftUI

private struct SSEEvent: Decodable {
    let type: String
    let payload: [String: String]?
}

struct Gast_ContentView: View {
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var partySession: PartySessionStore
    @State private var partyEndedAlert = false

    var body: some View {
        NavigationStack {
            ZStack {
                LinearGradient(
                    colors: [Color("primary"), Color("secondary"), Color("accent")],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()

                TabView {
                    SongAddView()
                        .tabItem {
                            Label("tab.addSong", systemImage: "plus")
                        }

                    VotingView()
                        .tabItem {
                            Label("tab.voting", systemImage: "heart")
                        }
                }
                .background(.clear)
            }
            .navigationTitle("app.title")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarBackground(.ultraThinMaterial, for: .navigationBar)
            .toolbarColorScheme(.light, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    NavigationLink(destination: ExitView()) {
                        Image(systemName: "rectangle.portrait.and.arrow.forward")
                            .foregroundStyle(.primary)
                    }
                }
            }
        }
        .tint(Color("accent"))
        .task { await listenForPartyEnded() }
        .alert("alert.partyEnded", isPresented: $partyEndedAlert) {
            Button("alert.ok") {
                partySession.clear()
                appState.currentSite = .start
            }
        }
    }

    private func listenForPartyEnded() async {
        guard let url = partySession.sseEventsURL else { return }
        var request = URLRequest(url: url)
        request.timeoutInterval = .infinity
        while !Task.isCancelled {
            do {
                let (bytes, _) = try await URLSession.shared.bytes(for: request)
                for try await line in bytes.lines {
                    guard line.hasPrefix("data:") else { continue }
                    let json = String(line.dropFirst(5)).trimmingCharacters(in: .whitespaces)
                    guard let data = json.data(using: .utf8),
                          let event = try? JSONDecoder().decode(SSEEvent.self, from: data),
                          event.type == "party-ended",
                          event.payload?["partyId"] == partySession.partyId
                    else { continue }
                    partyEndedAlert = true
                    return
                }
            } catch {
                if Task.isCancelled { return }
                try? await Task.sleep(for: .seconds(3))
            }
        }
    }
}

#Preview {
    Gast_ContentView()
        .environmentObject(AppState())
        .environmentObject(PartySessionStore())
}
