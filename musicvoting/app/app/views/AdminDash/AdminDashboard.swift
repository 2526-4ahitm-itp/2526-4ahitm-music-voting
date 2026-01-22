//
//  AdminDashboard.swift
//  app
//
//  Created by Sperrer Simone on 15.01.26.
//

import SwiftUI

struct AdminDashboard: View {
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Gerade Spielender Song
                    CurrentSongPlaying(
                        song: .init(
                            title: "Test",
                            artist: "Test",
                            imageUrl:
                                "https://i.scdn.co/image/ab67616d0000b273a6ca20eceb5f6c7199b98ccb"
                        )
                    )

                    // Warteschlange
                    QueueCard()

                }
                .padding()
            }
            .navigationTitle("Music Voting")
            .navigationBarTitleDisplayMode(.inline)
        }

    }
}

#Preview {
    AdminDashboard()
}
