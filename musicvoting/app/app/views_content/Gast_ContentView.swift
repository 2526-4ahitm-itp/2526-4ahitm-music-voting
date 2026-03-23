//
//  Gast_ContentView.swift
//  app
//
//  Created by Simone Sperrer on 19.03.26.
//

import SwiftUI

struct Gast_ContentView: View {
    @EnvironmentObject var appState: AppState
    
    var body: some View {
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
            
        }.tint(Color("secondary"))
        
        
        
    }
}

#Preview {
    Gast_ContentView()
}
