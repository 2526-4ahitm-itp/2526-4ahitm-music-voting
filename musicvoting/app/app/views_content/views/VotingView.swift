//
//  VotingView.swift
//  app
//
//  Created by Sperrer Simone on 15.01.26.
//

import SwiftUI

struct VotingView: View {
    var body: some View {
            ScrollView {
                Text("voting.title").font(.largeTitle).padding(.leading, 20)
                    .frame(maxWidth: .infinity, alignment: .leading)
                
        }
    }
}

#Preview {
    VotingView()
}
