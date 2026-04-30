//
//  ContentView.swift
//  app
//
//  Created by Sperrer Simone on 15.01.26.
//

import SwiftUI

enum SiteState {
    case start
    case hostMenu
    case hostPinEntry
    case spotifyAuth
    case admin
    case guest
    case codeInput
}

class AppState: ObservableObject {
    @Published var currentSite: SiteState = .start
}


struct ContentView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        switch appState.currentSite {
        case .start:
            StartView()
        case .hostMenu:
            HostMenuView()
        case .hostPinEntry:
            HostPinEntryView()
        case .spotifyAuth:
            SpotifyAuthView()
        case .admin:
            Admin_ContentView()
        case .guest:
            Gast_ContentView()
        case .codeInput:
            CodeInputView()
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(AppState())
}
