import SwiftUI

struct HostPinEntryView: View {
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var partySession: PartySessionStore

    @State private var pin = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @FocusState private var pinFocused: Bool

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
                            Text("Dashboard öffnen")
                                .font(.largeTitle)
                                .bold()
                                .foregroundStyle(.white)
                            Text("Gib den Host-PIN deiner Party ein.")
                                .font(.title3)
                                .foregroundStyle(.white.opacity(0.85))
                                .multilineTextAlignment(.center)
                        }
                        .padding(.horizontal, 24)

                        VStack(spacing: 15) {
                            TextField("12345", text: $pin)
                                .keyboardType(.numberPad)
                                .font(.system(size: 40, weight: .bold, design: .monospaced))
                                .multilineTextAlignment(.center)
                                .foregroundStyle(.white)
                                .padding(20)
                                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 20))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 20)
                                        .stroke(.white.opacity(0.3), lineWidth: 1)
                                )
                                .focused($pinFocused)
                                .onChange(of: pin) { newValue in
                                    pin = String(newValue.filter(\.isNumber).prefix(5))
                                }

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
                            }

                            Button {
                                Task { await submit() }
                            } label: {
                                Group {
                                    if isLoading {
                                        ProgressView()
                                            .tint(Color("primary"))
                                    } else {
                                        Text("Weiter")
                                            .font(.headline)
                                    }
                                }
                                .frame(maxWidth: .infinity)
                                .padding(20)
                                .background(
                                    RoundedRectangle(cornerRadius: 30)
                                        .fill(.white)
                                )
                            }
                            .foregroundStyle(Color("primary"))
                            .disabled(isLoading || pin.count != 5)
                            .opacity(pin.count == 5 ? 1 : 0.6)
                        }
                        .padding(.horizontal, 40)
                        .padding(.top, 10)
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
                        appState.currentSite = .hostMenu
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
            .onAppear { pinFocused = true }
        }
    }

    private func submit() async {
        guard pin.count == 5 else { return }
        isLoading = true
        errorMessage = nil
        do {
            _ = try await partySession.resolveAsHost(hostPin: pin)
            appState.currentSite = .admin
        } catch let error as PartySessionError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = "Fehler beim Laden der Party. Bitte versuche es erneut."
        }
        isLoading = false
    }
}

#Preview {
    HostPinEntryView()
        .environmentObject(AppState())
        .environmentObject(PartySessionStore())
}
