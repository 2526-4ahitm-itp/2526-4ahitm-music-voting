//
//  ExitView.swift
//  app
//
//  Created by Simone Sperrer on 20.03.26.
//

import SwiftUI

struct ExitView: View {
    
    var body: some View {
        @EnvironmentObject var appState: AppState

        
            NavigationStack {
                Spacer(minLength: 260)
                ScrollView {
                    
                                    
                    if (appState.currentSite == .guest)  {
                        Text("Möchstest du die Party wirklich verlassen?")
                            .font(.title2).bold(true)
                            .multilineTextAlignment(.center)
                        
                        Button {
                            appState.currentSite = .start
                        } label: {
                            Label("Ja, Party verlassen", systemImage: "party.popper")
                                .font(.headline)
                                .bold()
                                .frame(maxWidth: 240, alignment: .center)
                                .padding(15)
                                .background(LinearGradient(
                                    gradient: Gradient(colors: [
                                        Color("primary"), Color("accent"),
                                    ]),
                                    startPoint: .leading,
                                    endPoint: .trailing
                                ), in: RoundedRectangle(cornerRadius: 30))
                                
                                
                        }
                        .foregroundStyle(.white)
                        .padding(.horizontal, 40)
                        
                    } else if appState.currentSite == .admin {
                        Text("Möchstest du die Party wirklich beenden?")
                            .font(.title2).bold(true)
                            .multilineTextAlignment(.center)
                        
                        Button {
                            appState.currentSite = .start
                        } label: {
                            Label("Ja, Party verlassen", systemImage: "party.popper")
                                .font(.headline)
                                .bold()
                                .frame(maxWidth: 240, alignment: .center)
                                .padding(15)
                                .background(LinearGradient(
                                    gradient: Gradient(colors: [
                                        Color("primary"), Color("accent"),
                                    ]),
                                    startPoint: .leading,
                                    endPoint: .trailing
                                ), in: RoundedRectangle(cornerRadius: 30))
                                
                                
                        }
                        .foregroundStyle(.white)
                        .padding(.horizontal, 40)
                    }
                    
                    
                    
                    
                    }
                    .navigationTitle("Music Voting")
                    .navigationBarTitleDisplayMode(.inline)
                    
                }
                    
                    
            
        }
        
        
       
    
}

#Preview {
    ExitView()
}
