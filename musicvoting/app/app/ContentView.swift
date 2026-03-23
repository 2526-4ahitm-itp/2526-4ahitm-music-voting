//
//  ContentView.swift
//  app
//
//  Created by Sperrer Simone on 15.01.26.
//

import SwiftUI

enum SiteState {
    case start
    case admin
    case guest
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
        case .admin:
            Admin_ContentView()
        case .guest:
            Gast_ContentView()
        }
    }
}

#Preview {
    ContentView()
}
