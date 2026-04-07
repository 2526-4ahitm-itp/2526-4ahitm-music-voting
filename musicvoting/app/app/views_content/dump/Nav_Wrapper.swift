//
//  DefaultNavigationWrapper.swift
//  app
//
//  Created by Simone Sperrer on 07.04.26.
//

import SwiftUI

struct Nav_Wrapper<Content: View>: View {
    let title: String
    let content: Content
    
    init(title: String, @ViewBuilder content: () -> Content) {
        self.title = title
        self.content = content()
    }
    
    var body: some View {
        NavigationStack {
            content
                .navigationTitle(title)
                .navigationBarTitleDisplayMode(.inline)
                .toolbarBackground(.visible, for: .navigationBar)
                .toolbarBackground(.ultraThinMaterial, for: .navigationBar)
        }
    }
}

#Preview {
    Nav_Wrapper(title: "Music Voting") {
        Test_View()
    }
}
