//
//  Admin_ContentView.swift
//  app
//
//  Created by Simone Sperrer on 19.03.26.
//

import SwiftUI

private struct SSEEvent: Decodable {
    let type: String
}

struct Admin_ContentView: View {
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var partySession: PartySessionStore

    var body: some View {
        NavigationStack {
            TabView {
                AdminDashboard()
                    .tabItem {
                        Label("Admin", systemImage: "person.crop.circle")
                    }

                QRCodeView()
                    .tabItem {
                        Label("QR-Code", systemImage: "qrcode")
                    }

                VotingView()
                    .tabItem {
                        Label("Voting", systemImage: "heart")
                    }

                SongAddView()
                    .tabItem {
                        Label("Add Song", systemImage: "plus")
                    }
            }
            .navigationTitle("Music Voting")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.hidden, for: .navigationBar)
            //.toolbarBackground(.visible, for: .navigationBar)
            .toolbarBackground(.ultraThinMaterial, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    NavigationLink(destination: ExitView()) {
                        Image(systemName: "rectangle.portrait.and.arrow.forward")
                            .foregroundStyle(.primary)
                    }
                }
            }
        }
        .tint(Color("secondary"))
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
                          event.type == "party-ended"
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
        .preferredColorScheme(.dark)
}
