import SwiftUI

struct HostMenuView: View {
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var partySession: PartySessionStore

    @State private var isCreating = false
    @State private var errorMessage: String?

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
                    VStack(spacing: 24) {
                        Image("note")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 160)
                            .padding(.top, 100)

                        VStack(spacing: 8) {
                            Text("Gastgeber")
                                .font(.largeTitle)
                                .bold()
                                .foregroundStyle(.white)
                            Text("Was möchtest du tun?")
                                .font(.title3)
                                .foregroundStyle(.white.opacity(0.85))
                        }

                        VStack(spacing: 15) {
                            // Party erstellen
                            Button {
                                createParty()
                            } label: {
                                HStack(spacing: 16) {
                                    if isCreating {
                                        ProgressView()
                                            .tint(.white)
                                            .frame(width: 28, height: 28)
                                    } else {
                                        Image(systemName: "party.popper")
                                            .font(.title2)
                                            .frame(width: 28, height: 28)
                                    }
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text("Party erstellen")
                                            .font(.headline)
                                        Text("Neue Party starten und Spotify verbinden")
                                            .font(.caption)
                                            .opacity(0.8)
                                    }
                                    Spacer()
                                }
                                .padding(20)
                                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 30))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 30)
                                        .stroke(.white.opacity(0.3), lineWidth: 1)
                                )
                            }
                            .foregroundStyle(.white)
                            .disabled(isCreating)

                            // Dashboard öffnen
                            Button {
                                appState.currentSite = .hostPinEntry
                            } label: {
                                HStack(spacing: 16) {
                                    Image(systemName: "slider.horizontal.3")
                                        .font(.title2)
                                        .frame(width: 28, height: 28)
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text("Dashboard öffnen")
                                            .font(.headline)
                                        Text("Bestehende Party per PIN steuern")
                                            .font(.caption)
                                            .opacity(0.8)
                                    }
                                    Spacer()
                                }
                                .padding(20)
                                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 30))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 30)
                                        .stroke(.white.opacity(0.3), lineWidth: 1)
                                )
                            }
                            .foregroundStyle(.white)
                            .disabled(isCreating)
                        }
                        .padding(.horizontal, 40)
                        .padding(.top, 20)

                        if let error = errorMessage {
                            Text(error)
                                .font(.callout)
                                .foregroundStyle(.white)
                                .multilineTextAlignment(.center)
                                .bold()
                                .padding(16)
                                .frame(maxWidth: .infinity)
                                .background(Color("primary").opacity(0.30), in: RoundedRectangle(cornerRadius: 30))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 30)
                                        .stroke(.white.opacity(0.2), lineWidth: 2)
                                )
                                .padding(.horizontal, 40)
                        }
                    }
                    .padding(.bottom, 40)
                }
            }
            .navigationTitle("Music Voting")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarBackground(.ultraThinMaterial, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button {
                        appState.currentSite = .start
                    } label: {
                        Label("Zurück", systemImage: "chevron.left")
                            .font(.headline)
                            .bold()
                            .frame(maxWidth: 120)
                            .padding(12)
                            .background(
                                LinearGradient(
                                    gradient: Gradient(colors: [Color("primary"), Color("accent")]),
                                    startPoint: .leading,
                                    endPoint: .trailing
                                ),
                                in: RoundedRectangle(cornerRadius: 30)
                            )
                    }
                    .foregroundStyle(.white)
                }
            }
        }
    }

    private func createParty() {
        Task { @MainActor in
            isCreating = true
            errorMessage = nil
            do {
                _ = try await partySession.createParty()
                appState.currentSite = .spotifyAuth
            } catch let error as PartySessionError {
                errorMessage = error.errorDescription
            } catch {
                errorMessage = "Party konnte nicht erstellt werden. Bitte versuche es erneut."
            }
            isCreating = false
        }
    }
}

#Preview {
    HostMenuView()
        .environmentObject(AppState())
        .environmentObject(PartySessionStore())
}
