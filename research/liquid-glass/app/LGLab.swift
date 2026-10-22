// Liquid Glass measurement app (black-box). Renders public SwiftUI glass (`glassEffect`,
// `GlassEffectContainer`, `glassEffectUnion`) over controlled backgrounds so screenshots can be
// measured. Nothing here inspects Apple code; it only draws with public API.
//
// Scenes are chosen by the first launch argument (a query string) and then by `Documents/scene.txt`
// in the app's data container, which the app polls (the host rewrites it; no URL prompts). Once a
// scene has been on screen for a moment the app writes the same text to `Documents/shown.txt`. Keys:
//   layout   shapes-a | shapes-b | merge | union | none        (shapes come from layouts.json)
//   glass    regular | clear | none                            tint=RRGGBB  interactive=1
//   scheme   light | dark
//   bg       fringe (axis=x|y period=<px> phase=<k> n=<N> amp=<0-1> mean=<0-1>)
//            flat (color=RRGGBB) | checker (cell=<px>) | noise (seed=<n>) | photo | stripes
//   merge:   size=<pt> gap=<pt> spacing=<pt> y=<pt>
import SwiftUI
import UIKit

struct ShapeSpec: Decodable, Identifiable {
    var id: String
    var kind: String // circle | capsule | rect
    var x: CGFloat
    var y: CGFloat
    var w: CGFloat
    var h: CGFloat
    var r: CGFloat?
}

struct Layouts: Decodable {
    var layouts: [String: [ShapeSpec]]
}

let layouts: Layouts = {
    guard let url = Bundle.main.url(forResource: "layouts", withExtension: "json"),
          let data = try? Data(contentsOf: url),
          let decoded = try? JSONDecoder().decode(Layouts.self, from: data)
    else { return Layouts(layouts: [:]) }
    return decoded
}()

struct Spec: Equatable {
    var query: [String: String]
    func string(_ key: String, _ fallback: String) -> String { query[key] ?? fallback }
    func number(_ key: String, _ fallback: Double) -> Double { query[key].flatMap(Double.init) ?? fallback }

    init(query: [String: String]) { self.query = query }

    init(url: URL) {
        var q: [String: String] = [:]
        for item in URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems ?? [] {
            q[item.name] = item.value ?? ""
        }
        self.init(query: q)
    }

    static func fromLaunch() -> Spec {
        let args = ProcessInfo.processInfo.arguments.dropFirst()
        if let first = args.first(where: { $0.contains("=") }), let url = URL(string: "lglab://s?" + first) {
            return Spec(url: url)
        }
        return Spec(query: ["layout": "shapes-a", "bg": "fringe"])
    }
}

func hexColor(_ hex: String) -> (UInt8, UInt8, UInt8) {
    let value = UInt32(hex, radix: 16) ?? 0x808080
    return (UInt8((value >> 16) & 0xFF), UInt8((value >> 8) & 0xFF), UInt8(value & 0xFF))
}

/// Background as device pixels (1 image pixel = 1 screen pixel), sRGB.
func backgroundImage(_ spec: Spec, width: Int, height: Int) -> CGImage? {
    var pixels = [UInt8](repeating: 255, count: width * height * 4)
    let kind = spec.string("bg", "flat")
    func put(_ x: Int, _ y: Int, _ r: UInt8, _ g: UInt8, _ b: UInt8) {
        let i = (y * width + x) * 4
        pixels[i] = r; pixels[i + 1] = g; pixels[i + 2] = b; pixels[i + 3] = 255
    }
    switch kind {
    case "fringe":
        let horizontal = spec.string("axis", "x") == "x"
        let period = spec.number("period", 64)
        let n = spec.number("n", 4)
        let phase = 2 * Double.pi * spec.number("phase", 0) / n
        let amp = spec.number("amp", 0.3)
        let mean = spec.number("mean", 0.5)
        for y in 0..<height {
            for x in 0..<width {
                let c = Double(horizontal ? x : y)
                let v = mean + amp * cos(2 * Double.pi * c / period + phase)
                let b = UInt8(max(0, min(255, (v * 255).rounded())))
                put(x, y, b, b, b)
            }
        }
    case "checker":
        let cell = max(1, Int(spec.number("cell", 2)))
        let (r0, g0, b0) = hexColor(spec.string("a", "202020"))
        let (r1, g1, b1) = hexColor(spec.string("b", "e0e0e0"))
        for y in 0..<height {
            for x in 0..<width {
                if ((x / cell) + (y / cell)) % 2 == 0 { put(x, y, r0, g0, b0) } else { put(x, y, r1, g1, b1) }
            }
        }
    case "stripes":
        // Vertical black/white bars, 12px period: shows lensing and blur at a glance.
        let cell = max(1, Int(spec.number("cell", 6)))
        for y in 0..<height {
            for x in 0..<width {
                let on = ((x / cell) % 2 == 0) != ((y / (cell * 8)) % 2 == 0)
                let v: UInt8 = on ? 30 : 225
                put(x, y, v, v, v)
            }
        }
    case "noise":
        var state = UInt64(spec.number("seed", 1)) &* 6364136223846793005 &+ 1
        for y in 0..<height {
            for x in 0..<width {
                state = state &* 6364136223846793005 &+ 1442695040888963407
                let v: UInt8 = (state >> 63) == 0 ? 40 : 215
                put(x, y, v, v, v)
            }
        }
    case "photo":
        // A smooth, colourful, photo-like field (sum of soft coloured blobs over a sky gradient).
        let blobs: [(Double, Double, Double, (Double, Double, Double))] = [
            (0.2, 0.15, 0.25, (0.95, 0.45, 0.20)), (0.8, 0.25, 0.3, (0.15, 0.55, 0.95)),
            (0.35, 0.55, 0.3, (0.20, 0.80, 0.45)), (0.75, 0.7, 0.28, (0.90, 0.20, 0.55)),
            (0.25, 0.88, 0.25, (0.98, 0.85, 0.25)), (0.6, 0.45, 0.18, (0.10, 0.10, 0.25)),
        ]
        for y in 0..<height {
            for x in 0..<width {
                let u = Double(x) / Double(width), v = Double(y) / Double(height)
                var r = 0.55 + 0.25 * v, g = 0.65 + 0.15 * v, b = 0.85 - 0.2 * v
                for (cx, cy, s, c) in blobs {
                    let d2 = ((u - cx) * (u - cx) * 0.25 + (v - cy) * (v - cy) * 0.25 * 4.6) / (s * s * 0.25)
                    let w = exp(-d2 * 2.2)
                    r = r * (1 - w) + c.0 * w; g = g * (1 - w) + c.1 * w; b = b * (1 - w) + c.2 * w
                }
                put(x, y, UInt8(min(255, r * 255)), UInt8(min(255, g * 255)), UInt8(min(255, b * 255)))
            }
        }
    default:
        let (r, g, b) = hexColor(spec.string("color", "808080"))
        for y in 0..<height { for x in 0..<width { put(x, y, r, g, b) } }
    }
    guard let provider = CGDataProvider(data: Data(pixels) as CFData),
          let space = CGColorSpace(name: CGColorSpace.sRGB) else { return nil }
    return CGImage(width: width, height: height, bitsPerComponent: 8, bitsPerPixel: 32, bytesPerRow: width * 4,
                   space: space, bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.noneSkipLast.rawValue),
                   provider: provider, decode: nil, shouldInterpolate: false, intent: .defaultIntent)
}

func glassFor(_ spec: Spec) -> Glass? {
    var glass: Glass
    switch spec.string("glass", "regular") {
    case "none": return nil
    case "clear": glass = .clear
    default: glass = .regular
    }
    if let tint = spec.query["tint"] {
        let (r, g, b) = hexColor(tint)
        glass = glass.tint(Color(.sRGB, red: Double(r) / 255, green: Double(g) / 255, blue: Double(b) / 255))
    }
    if spec.query["interactive"] == "1" { glass = glass.interactive() }
    return glass
}

struct GlassShapeView: View {
    let shape: ShapeSpec
    let glass: Glass?

    var body: some View {
        let frame = Color.clear.frame(width: shape.w, height: shape.h)
        Group {
            if let glass {
                switch shape.kind {
                case "circle": frame.glassEffect(glass, in: .circle)
                case "capsule": frame.glassEffect(glass, in: .capsule)
                default: frame.glassEffect(glass, in: .rect(cornerRadius: shape.r ?? 0))
                }
            } else {
                frame
            }
        }
        .position(x: shape.x + shape.w / 2, y: shape.y + shape.h / 2)
    }
}

/// Two circles in one GlassEffectContainer: they blend once their gap is below `spacing`.
struct MergeView: View {
    let spec: Spec
    let glass: Glass
    let union: Bool
    @Namespace private var space

    var body: some View {
        let size = spec.number("size", 64)
        let gap = spec.number("gap", 16)
        let spacing = spec.number("spacing", 40)
        let y = spec.number("y", 300)
        let second = spec.number("second", size)
        GlassEffectContainer(spacing: spacing) {
            HStack(spacing: gap) {
                if union {
                    Color.clear.frame(width: size, height: size).glassEffect(glass, in: .circle).glassEffectUnion(id: "u", namespace: space)
                    Color.clear.frame(width: second, height: second).glassEffect(glass, in: .circle).glassEffectUnion(id: "u", namespace: space)
                } else {
                    Color.clear.frame(width: size, height: size).glassEffect(glass, in: .circle)
                    Color.clear.frame(width: second, height: second).glassEffect(glass, in: .circle)
                }
            }
        }
        .position(x: 201, y: y)
    }
}

struct RootView: View {
    let spec: Spec

    var body: some View {
        let screen = UIScreen.main
        let scale = screen.scale
        let size = screen.bounds.size
        let image = backgroundImage(spec, width: Int(size.width * scale), height: Int(size.height * scale))
        let glass = glassFor(spec)
        let layout = spec.string("layout", "shapes-a")
        ZStack(alignment: .topLeading) {
            if let image {
                Image(decorative: image, scale: scale)
                    .interpolation(.none)
                    .frame(width: size.width, height: size.height)
            }
            if layout == "merge" || layout == "union", let glass {
                MergeView(spec: spec, glass: glass, union: layout == "union")
            } else {
                ForEach(layouts.layouts[layout] ?? []) { shape in
                    GlassShapeView(shape: shape, glass: glass)
                }
            }
        }
        .frame(width: size.width, height: size.height, alignment: .topLeading)
        .ignoresSafeArea()
        .statusBarHidden(true)
        .persistentSystemOverlays(.hidden)
        .preferredColorScheme(spec.string("scheme", "light") == "dark" ? .dark : .light)
    }
}

@main
struct LGLabApp: App {
    @State private var spec = Spec.fromLaunch()

    var body: some Scene {
        WindowGroup {
            RootView(spec: spec)
                .id(spec.query.sorted(by: { $0.key < $1.key }).map { "\($0.key)=\($0.value)" }.joined(separator: "&"))
                .onOpenURL { url in spec = Spec(url: url) }
                .task { await poll() }
        }
    }

    /// Reads Documents/scene.txt every 50 ms; acknowledges a new scene after it has rendered.
    @MainActor
    func poll() async {
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let scene = docs.appendingPathComponent("scene.txt")
        let shown = docs.appendingPathComponent("shown.txt")
        var last = ""
        while true {
            try? await Task.sleep(nanoseconds: 50_000_000)
            guard let text = try? String(contentsOf: scene, encoding: .utf8) else { continue }
            let query = text.trimmingCharacters(in: .whitespacesAndNewlines)
            guard query != last, let url = URL(string: "lglab://s?" + query) else { continue }
            last = query
            spec = Spec(url: url)
            let settle = Double(spec.query["settle"] ?? "") ?? 0.9
            try? await Task.sleep(nanoseconds: UInt64(settle * 1_000_000_000))
            try? query.write(to: shown, atomically: true, encoding: .utf8)
        }
    }
}
