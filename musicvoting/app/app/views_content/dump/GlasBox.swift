//
//  GlasBox.swift
//  app
//
//  Created by Simone Sperrer on 19.03.26.
//

import SwiftUI

struct GlasBox: View {
    var body: some View {
        // Glas-Box
        VStack(alignment: .leading, spacing: 12) {
            Text("baldfjlsdfj")
        }
        .padding(25)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 30))
        .overlay(
            RoundedRectangle(cornerRadius: 30)
                .stroke(.white.opacity(0.3), lineWidth: 1)
        )
        .padding()
    }
}

#Preview {
    GlasBox()
}
