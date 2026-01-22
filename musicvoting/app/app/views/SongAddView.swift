//
//  SongAddView.swift
//  app
//
//  Created by Sperrer Simone on 15.01.26.
//

import SwiftUI

struct SongAddView: View {
    var body: some View {
        NavigationStack {
            ScrollView {

                Image(systemName: "plus")
                Text("Hinzufügen")

            }
            .navigationTitle("Music Voting")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

#Preview {
    SongAddView()
}
