//
//  QRCodeView.swift
//  app
//
//  Created by Sperrer Simone on 22.01.26.
//

import SwiftUI

struct QRCodeView: View {
    @EnvironmentObject private var partySession: PartySessionStore
    @State private var qrCodeImage: UIImage?
    @State private var isLoadingQR = false
    @State private var loadError = false

    var body: some View {
        VStack(spacing: 24) {
            Text("QR-Code & PIN")
                .font(.headline)

            if let pin = partySession.pin {
                VStack(spacing: 4) {
                    Text("Gäste-PIN")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Text(pin)
                        .font(.system(size: 48, weight: .bold, design: .monospaced))
                        .tracking(6)
                }
                .padding(.vertical, 8)
            }

            Group {
                if isLoadingQR {
                    ProgressView("QR-Code wird geladen…")
                        .frame(width: 260, height: 260)
                } else if let image = qrCodeImage {
                    Image(uiImage: image)
                        .interpolation(.none)
                        .resizable()
                        .scaledToFit()
                        .frame(width: 260, height: 260)
                } else if loadError {
                    VStack(spacing: 12) {
                        Image(systemName: "xmark.circle")
                            .font(.system(size: 40))
                            .foregroundStyle(.secondary)
                        Text("QR-Code konnte nicht geladen werden.")
                            .multilineTextAlignment(.center)
                            .foregroundStyle(.secondary)
                        Button("Erneut versuchen") {
                            Task { await loadQR() }
                        }
                    }
                    .frame(width: 260, height: 260)
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
                        .frame(width: 260, height: 260)
                        .overlay(Text("Kein QR-Code verfügbar.").multilineTextAlignment(.center))
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .padding()
        .task {
            await loadQR()
        }
    }

    private func loadQR() async {
        guard let url = partySession.partyURL(path: "qr") else {
            loadError = true
            return
        }
        isLoadingQR = true
        loadError = false
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            qrCodeImage = UIImage(data: data)
            if qrCodeImage == nil { loadError = true }
        } catch {
            loadError = true
        }
        isLoadingQR = false
    }
}

#Preview {
    QRCodeView()
        .environmentObject(PartySessionStore())
}
