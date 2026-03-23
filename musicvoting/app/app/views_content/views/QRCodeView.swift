//
//  QRCodeView.swift
//  app
//
//  Created by Sperrer Simone on 22.01.26.
//

import SwiftUI

struct QRCodeView: View {
    @State private var qrCodeImage: UIImage?
    @State private var textInput = "https://2526-4ahitm-itp.github.io/2526-4ahitm-music-voting/"

    var body: some View {
        VStack(spacing: 20) {
            Text("QR-Code Generator")
                .font(.headline)

            // QR-Code Bild oder Platzhalter
            if let image = qrCodeImage {
                Image(uiImage: image)
                    .interpolation(.none)
                    .resizable()
                    .frame(width: 300, height: 300)
            } else {
                Rectangle()
                    .fill(
                    
                        RadialGradient(
                                            gradient: Gradient(colors: [Color("accent"), Color("secondary"), Color("primary")]),
                                            center: .center,
                                            startRadius: 30,
                                            endRadius: 300
                        ).opacity(0.7)
                    
                    
                    
                    
                    
                    
                    )
                    .frame(width: 300, height: 300)
                    .overlay(Text("Es wurde noch kein QR-Code generiert.").multilineTextAlignment(.center))
            }

            
            // Button zum Generieren
            Button(action: {
                qrCodeImage = generateQRCode(from: textInput)
                print("Button gedrückt!")
            }) {
                Text("Generiere einen neuen QR-Code")
                    .font(.headline)
                    .foregroundColor(.white)
                    .padding()
                    .frame(maxWidth: .infinity)
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
            
            
            
        }
        .padding()
    }
}

#Preview {
    QRCodeView()
}
