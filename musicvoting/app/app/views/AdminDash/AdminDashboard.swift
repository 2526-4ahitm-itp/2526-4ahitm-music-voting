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
            VStack(alignment: .leading) {

                // Gerade Spielender Song
                
                
                
                
                
                
                // Warteschlange
                QueueCard()
                                .navigationTitle("Music Voting")
                                .navigationBarTitleDisplayMode(.inline)
                
                
                
                
                
                
                
                
                // QR-Code Section
                
                
                
            }
            .padding()
            .navigationTitle("Music Voting")
            .navigationBarTitleDisplayMode(.inline)  // oder .large
        }

    }
}

#Preview {
    AdminDashboard()
}
