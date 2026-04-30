import SwiftUI

struct ShakeEffect: GeometryEffect {
    var amount: CGFloat = 10
    var shakesPerUnit = 3
    var animatableData: CGFloat

    func effectValue(size: CGSize) -> ProjectionTransform {
        ProjectionTransform(CGAffineTransform(translationX:
            amount * sin(animatableData * .pi * CGFloat(shakesPerUnit)), y: 0))
    }
}

struct CodeInputView: View {
    @State private var code: String = ""
    @State private var attempts: Int = 0
    @State private var isLoading = false
    @State private var errorMessage: String?
    @FocusState private var isFocused: Bool
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var partySession: PartySessionStore

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
                    Text("Geben Sie Ihren Zugangscode ein:")
                        .font(.title2)
                        .foregroundColor(.white)
                        .bold()

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
                                        .shadow(color: .black.opacity(0.1), radius: 10, x: 0, y: 5)

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
                        appState.currentSite = .start
                    } label: {
                        Label("Zurück", systemImage: "chevron.left")
                            .font(.headline)
                            .bold()
                            .frame(maxWidth: 120)
                            .padding(12)
                            .background(
                                LinearGradient(
                                    gradient: Gradient(colors: [
                                        Color("primary"),
                                        Color("accent")
                                    ]),
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
            _ = try await partySession.resolve(pin: code)
            isFocused = false
            withAnimation(.easeInOut) {
                appState.currentSite = .guest
            }
        } catch let error as PartySessionError {
            triggerError(error.errorDescription ?? "Falscher Code")
        } catch {
            triggerError("Falscher Code")
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
    CodeInputView()
        .environmentObject(AppState())
        .environmentObject(PartySessionStore())
}
