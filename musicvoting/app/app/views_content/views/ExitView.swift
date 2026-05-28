//
//  ExitView.swift
//  app
//
//  Created by Simone Sperrer on 20.03.26.
//

import SwiftUI
import SwiftUI

struct ExitView: View {
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var partySession: PartySessionStore

    var body: some View {
        VStack {
            Spacer()
            
            VStack(spacing: 20) {
                
                let isGuest = appState.currentSite == .guest
                
                Text(isGuest
                     ? "Möchtest du die Party wirklich verlassen?"
                     : "Möchtest du die Party wirklich beenden?")
                    .font(.title2)
                    .bold()
                    .multilineTextAlignment(.center)
                
                Button {
                    handleExit()
                } label: {
                    Label(
                        isGuest ? "Ja, Party verlassen" : "Ja, Party beenden",
                        systemImage: "party.popper"
                    )
                    .font(.headline)
                    .bold()
                    .frame(maxWidth: 240)
                    .padding(15)
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
            .padding(.horizontal, 40)
            
            Spacer()
        }
    }
    
    // Funktionalitär des Exit
    private func handleExit() {
            switch appState.currentSite {
                
            case .guest:
                handleGuestExit()
                
            case .admin:
                handleAdminExit()
                
            default:
                break
            }
        }
        
        private func handleGuestExit() {
            partySession.clear()
            appState.currentSite = .start
        }

        private func handleAdminExit() {
            Task {
                do {
                    try await partySession.endParty()
                } catch {
                    partySession.clear()
                }
                appState.currentSite = .start
            }
        }
}

#Preview {
    ExitView()
        .environmentObject(AppState())
        .environmentObject(PartySessionStore())
}
