
import UIKit
import ImageIO

public struct Downsampler {
    public static func downsample(imageAt url: URL, to pointSize: CGSize, scale: CGFloat) -> UIImage? {
        let options = [kCGImageSourceShouldCache: false] as CFDictionary
        guard let src = CGImageSourceCreateWithURL(url as CFURL, options) else { return nil }
        let maxDim = max(pointSize.width, pointSize.height) * scale
        let downsampleOpts = [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceShouldCacheImmediately: true,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceThumbnailMaxPixelSize: maxDim
        ] as CFDictionary
        guard let cg = CGImageSourceCreateThumbnailAtIndex(src, 0, downsampleOpts) else { return nil }
        return UIImage(cgImage: cg)
    }
}

final class ImageCell: UICollectionViewCell {
    let iv = UIImageView()
    override init(frame: CGRect) { super.init(frame: frame); contentView.addSubview(iv); iv.frame = contentView.bounds }
    required init?(coder: NSCoder) { fatalError() }

    func configure(with url: URL) {
        let start = CFAbsoluteTimeGetCurrent()
        iv.image = Downsampler.downsample(imageAt: url, to: bounds.size, scale: UIScreen.main.scale)
        let dt = (CFAbsoluteTimeGetCurrent() - start) * 1000
        print("downsample ms=\(Int(dt))")
    }
}
