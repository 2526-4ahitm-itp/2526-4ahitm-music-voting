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
                        Text("info.appName")
                            .font(.system(size: 40).bold())
                        Text("info.tagline")
                            .font(.headline)
                            .opacity(0.9)
                    }
                    .foregroundStyle(.white)
                    .padding(.horizontal, 20)
                    .padding(.top, 20)
                    
                    // Sektion: Das Problem
                    InfoCard(
                        icon: "hand.thumbsdown.fill",
                        title: String(localized: "info.problem.title"),
                        text: String(localized: "info.problem.text")
                    )

                    // Sektion: Die Lösung
                    InfoCard(
                        icon: "bolt.fill",
                        title: String(localized: "info.solution.title"),
                        text: String(localized: "info.solution.text")
                    )

                    // Sektion: Technik & Ziel
                    InfoCard(
                        icon: "target",
                        title: String(localized: "info.goal.title"),
                        text: String(localized: "info.goal.text")
                    )
                    
                    // Externer Link Button
                    Link(destination: URL(string: "https://2526-4ahitm-itp.github.io/2526-4ahitm-music-voting/")!) {
                        HStack {
                            Text("info.learnMore")
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
        .navigationTitle("app.title")
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
