//
//  TemplateView.swift
//  app
//
//  Created by Simone Sperrer on 24.03.26.
//

import SwiftUI

struct TemplateView: View {
    var body: some View {
        NavigationStack {
            ScrollView {
                Text("Hello World!")
                
                
                
                
                
            }
            .navigationTitle("Music Voting")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

#Preview {
    TemplateView()
}
