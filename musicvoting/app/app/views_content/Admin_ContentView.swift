//
//  Admin_ContentView.swift
//  app
//
//  Created by Simone Sperrer on 19.03.26.
//

import SwiftUI

private struct SSEEvent: Decodable {
    let type: String
    let payload: [String: String]?
}

struct Admin_ContentView: View {
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var partySession: PartySessionStore

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
                    AdminDashboard()
                        .tabItem {
                            Label("tab.admin", systemImage: "person.crop.circle")
                        }

                    QRCodeView()
                        .tabItem {
                            Label("tab.qrCode", systemImage: "qrcode")
                        }

                    VotingView()
                        .tabItem {
                            Label("tab.voting", systemImage: "heart")
                        }

                    SongAddView()
                        .tabItem {
                            Label("tab.addSong", systemImage: "plus")
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
                    partySession.clear()
                    appState.currentSite = .start
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
    Admin_ContentView()
        .environmentObject(AppState())
        .environmentObject(PartySessionStore())
}
