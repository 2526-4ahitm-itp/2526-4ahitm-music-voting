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
    @State private var isLoadingQR = true
    @State private var loadError = false

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color("primary"), Color("secondary"), Color("accent")],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            ScrollView {
            VStack(spacing: 24) {
                Text("qr.title")
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundStyle(.white)

                if let pin = partySession.pin {
                    VStack(spacing: 4) {
                        Text("qr.guestPin")
                            .font(.subheadline)
                            .foregroundStyle(.white.opacity(0.8))
                        Text(pin)
                            .font(.system(size: 48, weight: .bold, design: .monospaced))
                            .foregroundStyle(.white)
                            .tracking(6)
                    }
                    .padding()
                    .background(Color.white.opacity(0.15), in: RoundedRectangle(cornerRadius: 12))
                }

                Group {
                    if isLoadingQR {
                        ProgressView("qr.loading")
                            .tint(.white)
                            .frame(width: 260, height: 260)
                    } else if let image = qrCodeImage {
                        Image(uiImage: image)
                            .interpolation(.none)
                            .resizable()
                            .scaledToFit()
                            .frame(width: 260, height: 260)
                            .background(Color.white)
                    } else if loadError {
                        VStack(spacing: 12) {
                            Image(systemName: "xmark.circle")
                                .font(.system(size: 40))
                                .foregroundStyle(.white.opacity(0.7))
                            Text("qr.error.load")
                                .multilineTextAlignment(.center)
                                .foregroundStyle(.white)
                            Button("qr.retry") {
                                Task { await loadQR() }
                            }
                            .foregroundStyle(.white)
                            .padding(.horizontal, 20)
                            .padding(.vertical, 10)
                            .background(Color.white.opacity(0.2), in: RoundedRectangle(cornerRadius: 8))
                        }
                        .frame(width: 260, height: 260)
                    } else {
                        Rectangle()
                            .fill(Color.white.opacity(0.2))
                            .frame(width: 260, height: 260)
                            .overlay(
                                Text("qr.error.unavailable")
                                    .foregroundStyle(.white)
                                    .multilineTextAlignment(.center)
                            )
                    }
                }
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .shadow(color: .black.opacity(0.15), radius: 12, x: 0, y: 4)

                Text("qr.hint")
                    .font(.callout)
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.center)
                    .padding()
                    .frame(maxWidth: .infinity)
                    .background(Color.white.opacity(0.15), in: RoundedRectangle(cornerRadius: 12))
            }
            .padding()
            .frame(maxWidth: .infinity)
        }
        } // ZStack
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
