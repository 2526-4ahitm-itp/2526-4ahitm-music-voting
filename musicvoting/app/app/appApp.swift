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
                    auth.handleCallback(url)
                }
        }
    }
}
