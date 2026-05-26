//
//  appApp.swift
//  app
//
//  Created by Sperrer Simone on 15.01.26.
//

import SwiftUI

@main
struct appApp: App {
    @StateObject private var auth = SpotifyAuthViewModel()
    @StateObject var appState = AppState()
    @StateObject private var partySession = PartySessionStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(auth)
                .environmentObject(appState)
                .environmentObject(partySession)
                .onOpenURL { url in
                    if url.scheme == "musicvotingapp",
                       url.host == "join",
                       let pin = url.pathComponents.first(where: { $0 != "/" }) {
                        if let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
                           let backend = components.queryItems?.first(where: { $0.name == "backend" })?.value,
                           !backend.isEmpty {
                            BackendConfiguration.setBaseURLString(backend)
                        }
                        appState.pendingGuestPin = pin
                        appState.currentSite = .codeInput
                    } else {
                        auth.handleCallback(url)
                    }
                }
        }
    }
}
