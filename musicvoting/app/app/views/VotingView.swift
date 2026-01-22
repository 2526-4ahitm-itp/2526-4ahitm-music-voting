//
//  VotingView.swift
//  app
//
//  Created by Sperrer Simone on 15.01.26.
//

import SwiftUI

struct VotingView: View {
    var body: some View {
        NavigationStack {
            ScrollView {

                Image(systemName: "heart.fill")
                Text("Voten")

            }
            .navigationTitle("Music Voting")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

#Preview {
    VotingView()
}
