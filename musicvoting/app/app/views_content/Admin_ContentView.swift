//
//  Admin_ContentView.swift
//  app
//
//  Created by Simone Sperrer on 19.03.26.
//

import SwiftUI

struct Admin_ContentView: View {
    @EnvironmentObject var appState: AppState

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
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarBackground(.ultraThinMaterial, for: .navigationBar)
            .toolbarColorScheme(.light, for: .navigationBar)
        }
        .tint(Color("secondary"))
    }
}

#Preview {
    Admin_ContentView()
        .environmentObject(AppState())
}
