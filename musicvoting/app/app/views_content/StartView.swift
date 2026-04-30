//
//  StartView.swift
//  app
//
//  Created by Simone Sperrer on 18.03.26.
//
import SwiftUI

struct StartView: View {
    @EnvironmentObject var appState: AppState
    
    var body: some View {
                   
            NavigationStack {
                ZStack {
                    LinearGradient(
                        colors: [Color("primary"), Color("secondary"), Color("accent")],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                    .ignoresSafeArea()
                    
                    ScrollView {
                        VStack(spacing: 20) {
                            Image("note")
                                .resizable()
                                .scaledToFit()
                                .frame(width: 200)
                                .padding(.top, 120)
                            
                            VStack {
                                Text("Schlechte Musik auf der Party? Nicht mehr! Denn MusicVoting ermöglicht es jedem Partygast ganz einfach mittels Smartphone mitzubestimmen, welche Musik gespielt werden soll.")
                                    .foregroundStyle(.white)
                                    .multilineTextAlignment(.center)
                                    .font(.title2)
                                    .bold()
                            }
                            .padding(20)
                            
                            // Pfeile
                            HStack(spacing: 30) {
                                ForEach(0..<3) { _ in
                                    Image(systemName: "arrow.down")
                                        .foregroundStyle(.white)
                                        .font(.system(size: 30, weight: .bold))
                                }
                            }
                            .padding(.top, 30)
                            
                            // Buttons
                            VStack(spacing: 15) {
                                // Button 1: Gast
                                Button {
                                    withAnimation(.easeInOut) {
                                        appState.currentSite = .codeInput
                                    }
                                } label: {
                                    Label("Gast auf einer Party", systemImage: "party.popper")
                                        .font(.headline)
                                        .frame(maxWidth: .infinity, alignment: .leading)
                                        .padding(20)
                                        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 30))
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 30)
                                                .stroke(.white.opacity(0.3), lineWidth: 1)
                                        )
                                }
                                .foregroundStyle(.white)
                                .padding(.horizontal, 40)
                                
                                // Button 2: Gastgeber
                                Button {
                                    withAnimation(.easeInOut) {
                                        appState.currentSite = .hostMenu
                                    }
                                } label: {
                                    Label("Gastgeber auf einer Party", systemImage: "crown")
                                        .font(.headline)
                                        .frame(maxWidth: .infinity, alignment: .leading)
                                        .padding(20)
                                        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 30))
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 30)
                                                .stroke(.white.opacity(0.3), lineWidth: 1)
                                        )
                                }
                                .foregroundStyle(.white)
                                .padding(.horizontal, 40)
                            }
                            .padding(.top, 50)
                        }
                    }
                }
                .navigationTitle("Music Voting")
                .navigationBarTitleDisplayMode(.inline)
                .toolbarBackground(.visible, for: .navigationBar)
                .toolbarBackground(.ultraThinMaterial, for: .navigationBar)
                .toolbar {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        HStack(spacing: 14) {
                            NavigationLink(destination: BackendSettingsView()) {
                                Image(systemName: "gearshape")
                                    .foregroundStyle(.white)
                            }
                            .accessibilityIdentifier("start.settings")

                            NavigationLink(destination: InfoView()) {
                                Image(systemName: "info.circle")
                                    .foregroundStyle(.white)
                            }
                            .accessibilityIdentifier("start.info")
                        }
                    }
                }
            
        }
    }
}


#Preview {
    StartView()
}
