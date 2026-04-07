//
//  InfoView.swift
//  app
//
//  Created by Simone Sperrer on 24.03.26.
//

import SwiftUI

struct InfoView: View {
    var body: some View {
        ZStack {
            // Hintergrund-Gradient beibehalten
            LinearGradient(
                colors: [Color("primary"), Color("secondary"), Color("accent")],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            ScrollView {
                VStack(alignment: .leading, spacing: 25) {
                    
                    // Header
                    VStack(alignment: .leading, spacing: 8) {
                        Text("MusicVoting")
                            .font(.system(size: 40).bold())
                        Text("Schlechte Musik auf der Party? Nicht mehr!")
                            .font(.headline)
                            .opacity(0.9)
                    }
                    .foregroundStyle(.white)
                    .padding(.horizontal, 20)
                    .padding(.top, 20)
                    
                    // Sektion: Das Problem
                    InfoCard(
                        icon: "hand.thumbsdown.fill",
                        title: "Das Problem",
                        text: "Oft hat der Gastgeber keine Zeit für die Musik oder der Geschmack der Gäste geht auseinander. Die Folge? Langweilige Stimmung."
                    )
                    
                    // Sektion: Die Lösung
                    InfoCard(
                        icon: "bolt.fill",
                        title: "Unsere Lösung",
                        text: "Jeder Gast kann via Smartphone Songs zur Playlist hinzufügen und über die Reihenfolge abstimmen. Demokratie auf dem Dancefloor!"
                    )
                    
                    // Sektion: Technik & Ziel
                    InfoCard(
                        icon: "target",
                        title: "Das Ziel",
                        text: "Eine benutzerfreundliche App, die über Spotify Premium läuft und für maximale Partystimmung sorgt."
                    )
                    
                    // Externer Link Button
                    Link(destination: URL(string: "https://2526-4ahitm-itp.github.io/2526-4ahitm-music-voting/")!) {
                        HStack {
                            Text("Mehr über das Projekt erfahren")
                            Image(systemName: "arrow.up.right.square")
                        }
                        .font(.headline)
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(.white.opacity(0.2))
                        .clipShape(RoundedRectangle(cornerRadius: 15))
                        .overlay(
                            RoundedRectangle(cornerRadius: 15)
                                .stroke(.white.opacity(0.3), lineWidth: 1)
                        )
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 30)
                }
            }
        }
        .navigationTitle("Music Voting")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(.visible, for: .navigationBar)
        .toolbarBackground(.ultraThinMaterial, for: .navigationBar)
    }
}

// Eine wiederverwendbare Card-Komponente für das Design
struct InfoCard: View {
    let icon: String
    let title: String
    let text: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: icon)
                    .font(.title2)
                Text(title)
                    .font(.title3)
                    .bold()
            }
            .foregroundStyle(.white)
            
            Text(text)
                .font(.body)
                .foregroundStyle(.white.opacity(0.85))
                .lineSpacing(4)
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 20))
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .stroke(.white.opacity(0.2), lineWidth: 1)
        )
        .padding(.horizontal, 20)
    }
}

#Preview {
    NavigationStack {
        InfoView()
    }
}
