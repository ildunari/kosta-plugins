
import UIKit

// Tips: Avoid offscreen when possible; if you must blend, consider rasterizing static complex layers.
// Provide shadowPath to avoid expensive dynamic shadow; avoid masksToBounds+cornerRadius on animated views.
final class CardView: UIView {
    override init(frame: CGRect) { super.init(frame: frame); setup() }
    required init?(coder: NSCoder) { super.init(coder: coder); setup() }

    private func setup() {
        backgroundColor = .systemBackground
        layer.cornerRadius = 12
        layer.shadowOpacity = 0.25
        layer.shadowRadius = 8
        updateShadowPath()
        // Avoid masksToBounds because it disables shadow; if clipping is needed, use a rounded mask image.
        layer.shouldRasterize = true  // only for mostly-static content
        layer.rasterizationScale = UIScreen.main.scale
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        updateShadowPath()
    }

    private func updateShadowPath() {
        layer.shadowPath = UIBezierPath(roundedRect: bounds, cornerRadius: 12).cgPath
    }
}
