//
//  appApp.swift
//  app
//
//  Created by Sperrer Simone on 15.01.26.
//

import SwiftUI

@main
struct appApp: App {
    @StateObject private var auth = SpotifyAuthViewModel();
    @StateObject var appState = AppState();
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(auth)
                .onOpenURL { url in
                    auth.handleCallback(url)
                }
                .environmentObject(appState)
        }
    }
}
