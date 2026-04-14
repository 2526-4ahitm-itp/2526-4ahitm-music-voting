//
//  CodeInputView.swift
//  app
//
//  Created by Simone Sperrer on 24.03.26.
//
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
    @State private var showError: Bool = false
    @State private var attempts: Int = 0 // Für den Shake-Trigger
    @FocusState private var isFocused: Bool
    @EnvironmentObject var appState: AppState
    
    private let codeLength = 5
    
    var body: some View {
        NavigationStack {
            ZStack {
                // Dein Original Gradient
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
                                
                                showError = false
                                code = trimmed
                                
                                if code.count == codeLength {
                                    if checkCode() {
                                        isFocused = false
                                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
                                            withAnimation(.easeInOut) {
                                                appState.currentSite = .guest
                                            }
                                        }
                                    } else {
                                        let generator = UINotificationFeedbackGenerator()
                                        generator.notificationOccurred(.error)
                                            
                                        withAnimation(.default) {
                                            showError = true
                                            attempts += 1
                                        }
                                    }
                                }
                            }
                        
                        // Deine Original Eingabefelder
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
                                    
                                    Text(getDigit(at: index))
                                        .font(.system(size: 28, weight: .bold, design: .rounded))
                                        .foregroundColor(.white)
                                }
                                .onTapGesture {
                                    isFocused = true
                                }
                            }
                        }
                        // Nur dieser Modifier wurde zur HStack hinzugefügt:
                        .modifier(ShakeEffect(animatableData: CGFloat(attempts)))
                    }
                    
                    if showError {
                        Text("Falscher Code")
                            .foregroundColor(.red)
                            .font(.title3)
                            .transition(.opacity).bold()
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
        let index = code.index(code.startIndex, offsetBy: index)
        return String(code[index])
    }
    
    private func checkCode() -> Bool {
        return code == "12345"
    }
}

#Preview {
    CodeInputView()
}
