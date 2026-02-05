//
//  generateQRCode.swift
//  app
//
//  Created by Sperrer Simone on 05.02.26.
//

import SwiftUI
import CoreImage
import CoreImage.CIFilterBuiltins

func generateQRCode(from string: String) -> UIImage? {
    let context = CIContext()
    let filter = CIFilter.qrCodeGenerator()

    filter.message = Data(string.utf8)

    if let outputImage = filter.outputImage {
        // Skalieren, da das Originalbild sehr klein ist (meist 27x27 px)
        let transform = CGAffineTransform(scaleX: 10, y: 10)
        let scaledImage = outputImage.transformed(by: transform)
        
        if let cgImage = context.createCGImage(scaledImage, from: scaledImage.extent) {
            return UIImage(cgImage: cgImage)
        }
    }

    return nil
}
