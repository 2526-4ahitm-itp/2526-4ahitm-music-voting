import SwiftUI

struct HostPinEntryView: View {
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var partySession: PartySessionStore

    @State private var code = ""
    @State private var attempts: Int = 0
    @State private var isLoading = false
    @State private var errorMessage: String?
    @FocusState private var isFocused: Bool

    private let codeLength = 5

    var body: some View {
        NavigationStack {
            ZStack {
                LinearGradient(
                    colors: [Color("primary"), Color("secondary"), Color("accent")],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()

                VStack(spacing: 30) {
                    Image("note")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 160)
                        .padding(.top, 40)

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

                    ZStack {
                        TextField("", text: $code)
                            .keyboardType(.numberPad)
                            .textContentType(.oneTimeCode)
                            .focused($isFocused)
                            .opacity(0)
                            .frame(width: 1, height: 1)
                            .onChange(of: code) { newValue in
                                let filtered = newValue.filter { "0123456789".contains($0) }
                                let trimmed = String(filtered.prefix(codeLength))
                                errorMessage = nil
                                code = trimmed
                                if code.count == codeLength && !isLoading {
                                    Task { await submit() }
                                }
                            }

                        HStack(spacing: 15) {
                            ForEach(0..<codeLength, id: \.self) { index in
                                ZStack {
                                    RoundedRectangle(cornerRadius: 15)
                                        .fill(.ultraThinMaterial)
                                        .frame(width: 55, height: 70)
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 15)
                                                .stroke(
                                                    isFocused && code.count == index
                                                    ? .white
                                                    : .white.opacity(0.2),
                                                    lineWidth: 1.5
                                                )
                                        )
                                        .shadow(color: .primary.opacity(0.1), radius: 10, x: 0, y: 5)

                                    if isLoading && index < code.count {
                                        ProgressView()
                                            .tint(.white)
                                            .scaleEffect(0.7)
                                    } else {
                                        Text(getDigit(at: index))
                                            .font(.system(size: 28, weight: .bold, design: .rounded))
                                            .foregroundColor(.white)
                                    }
                                }
                                .onTapGesture {
                                    isFocused = true
                                }
                            }
                        }
                        .modifier(ShakeEffect(animatableData: CGFloat(attempts)))
                    }

                    if let error = errorMessage {
                        Text(error)
                            .foregroundColor(.white)
                            .font(.title3)
                            .bold()
                            .multilineTextAlignment(.center)
                            .transition(.opacity)
                    }

                    Spacer()
                }
                .padding(.top, 50)
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
            .onAppear {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    isFocused = true
                }
            }
        }
    }

    private func getDigit(at index: Int) -> String {
        guard index < code.count else { return "" }
        let i = code.index(code.startIndex, offsetBy: index)
        return String(code[i])
    }

    private func submit() async {
        guard code.count == codeLength else { return }
        isLoading = true
        errorMessage = nil
        do {
            _ = try await partySession.resolveAsHost(hostPin: code)
            isFocused = false
            withAnimation(.easeInOut) {
                appState.currentSite = .admin
            }
        } catch let error as PartySessionError {
            triggerError(error.errorDescription ?? "Falscher PIN")
        } catch {
            triggerError("Falscher PIN")
        }
        isLoading = false
    }

    private func triggerError(_ message: String) {
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.error)
        withAnimation(.default) {
            errorMessage = message
            attempts += 1
        }
        code = ""
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
            isFocused = true
        }
    }
}

#Preview {
    HostPinEntryView()
        .environmentObject(AppState())
        .environmentObject(PartySessionStore())
}
