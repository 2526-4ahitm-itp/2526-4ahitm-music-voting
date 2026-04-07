//
//  Gast_ContentView.swift
//  app
//
//  Created by Simone Sperrer on 19.03.26.
//

import SwiftUI

import SwiftUI

struct Gast_ContentView: View {
    @EnvironmentObject var appState: AppState
    
    var body: some View {
        NavigationStack {
            TabView {
                
                SongAddView()
                    .tabItem {
                        Label("Add Song", systemImage: "plus")
                    }
                
                VotingView()
                    .tabItem {
                        Label("Voting", systemImage: "heart")
                    }
                
                ExitView()
                    .tabItem {
                        Label("Verlassen", systemImage: "rectangle.portrait.and.arrow.forward")
                    }
            }
            .navigationTitle("Music Voting")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarBackground(.ultraThinMaterial, for: .navigationBar)
            .toolbarColorScheme(.light, for: .navigationBar)
        }
        .tint(Color("secondary"))
    }
}


#Preview {
    Gast_ContentView()
        .environmentObject(AppState())
}
