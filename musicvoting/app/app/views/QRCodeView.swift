//
//  QRCodeView.swift
//  app
//
//  Created by Sperrer Simone on 22.01.26.
//

import SwiftUI

struct QRCodeView: View {
    var body: some View {
        NavigationStack {

            Image("qr-code")
                .resizable()  // Macht das Bild skalierbar
                .scaledToFit()
                .frame(width: 300, height: 300)

            Button(action: {
                print("Button gedrückt!")
            }) {
                Text("Generiere einen neuen QR-Code")
                    .font(.headline)
                    .foregroundColor(.white)
                    .padding()
                    .frame(maxWidth: .infinity)  // Macht den Button breit
                    .background(
                        LinearGradient(
                            gradient: Gradient(colors: [
                                Color("primary"), Color("accent"),
                            ]),
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .cornerRadius(15)
                    .shadow(
                        color: Color.black.opacity(0.2),
                        radius: 10,
                        x: 0,
                        y: 5
                    )
            }
            .padding(.horizontal)

            .navigationTitle("Music Voting")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

#Preview {
    QRCodeView()
}
