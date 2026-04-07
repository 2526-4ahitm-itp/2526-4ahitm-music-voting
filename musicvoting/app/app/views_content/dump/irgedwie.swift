//
//  irgedwie.swift
//  app
//
//  Created by Simone Sperrer on 23.03.26.
//

import SwiftUI

struct irgedwie: View {
    var body: some View {
        Text(/*@START_MENU_TOKEN@*/"Hello, World!"/*@END_MENU_TOKEN@*/)
        
        /*
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
            
        }
         */
    }
}

#Preview {
    irgedwie()
}



