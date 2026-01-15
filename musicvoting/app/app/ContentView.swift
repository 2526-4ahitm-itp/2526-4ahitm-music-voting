//
//  ContentView.swift
//  app
//
//  Created by Sperrer Simone on 15.01.26.
//

import SwiftUI

struct ContentView: View {
    var body: some View {
        TabView {
            AdminDashboard()
                .tabItem {
                    Label("Admin", systemImage: "person.crop.circle")
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
    }
}

#Preview {
    ContentView()
}
