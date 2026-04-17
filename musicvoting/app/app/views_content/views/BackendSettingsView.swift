import SwiftUI

struct BackendSettingsView: View {
    @State private var address: String = BackendConfiguration.baseURLString
    @State private var message: String?
    @FocusState private var isFieldFocused: Bool

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color("primary"), Color("secondary"), Color("accent")],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text("Backend")
                        .font(.system(size: 32).bold())
                        .foregroundStyle(.white)
                        .padding(.top, 20)

                    Text("Trage hier die IP/Adresse deines Macs ein (im iPhone-Hotspot z.B. `172.20.10.2:8080`).")
                        .font(.headline)
                        .foregroundStyle(.white.opacity(0.9))

                    TextField("z.B. 172.20.10.2:8080", text: $address)
                        .textInputAutocapitalization(.never)
                        .disableAutocorrection(true)
                        .keyboardType(.URL)
                        .textContentType(.URL)
                        .focused($isFieldFocused)
                        .padding(14)
                        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16))
                        .overlay(
                            RoundedRectangle(cornerRadius: 16)
                                .stroke(.white.opacity(0.25), lineWidth: 1)
                        )
                        .foregroundStyle(.white)

                    if let message {
                        Text(message)
                            .font(.callout)
                            .foregroundStyle(.white)
                            .padding(12)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(.white.opacity(0.15), in: RoundedRectangle(cornerRadius: 14))
                            .overlay(
                                RoundedRectangle(cornerRadius: 14)
                                    .stroke(.white.opacity(0.2), lineWidth: 1)
                            )
                    }

                    VStack(spacing: 12) {
                        Button {
                            isFieldFocused = false
                            if BackendConfiguration.setBaseURLString(address) {
                                address = BackendConfiguration.baseURLString
                                message = "Gespeichert: \(address)"
                            } else {
                                message = "Ungültige Adresse. Beispiel: 172.20.10.2:8080"
                            }
                        } label: {
                            Label("Speichern", systemImage: "checkmark.circle")
                                .font(.headline)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(16)
                                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 20))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 20)
                                        .stroke(.white.opacity(0.3), lineWidth: 1)
                                )
                        }
                        .foregroundStyle(.white)
                        .accessibilityIdentifier("backendSettings.save")

                        Button {
                            isFieldFocused = false
                            BackendConfiguration.resetToDefault()
                            address = BackendConfiguration.baseURLString
                            message = "Zurückgesetzt auf \(address)"
                        } label: {
                            Label("Zurücksetzen", systemImage: "arrow.counterclockwise")
                                .font(.headline)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(16)
                                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 20))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 20)
                                        .stroke(.white.opacity(0.3), lineWidth: 1)
                                )
                        }
                        .foregroundStyle(.white)
                        .accessibilityIdentifier("backendSettings.reset")
                    }
                    .padding(.top, 6)
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 30)
            }
        }
        .navigationTitle("Backend")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(.visible, for: .navigationBar)
        .toolbarBackground(.ultraThinMaterial, for: .navigationBar)
        .toolbarColorScheme(.dark, for: .navigationBar)
    }
}

#Preview {
    NavigationStack {
        BackendSettingsView()
    }
}

