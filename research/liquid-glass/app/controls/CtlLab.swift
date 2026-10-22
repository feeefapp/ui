// Controls measurement app (black-box), the companion of LGLab. Renders standard iOS 26 SwiftUI /
// UIKit controls with public API only, over flat backgrounds, so screenshots and screen recordings
// can be measured. It also writes the layout frames SwiftUI reports (`onGeometryChange`) and a few
// public UIKit sizes (`intrinsicContentSize`, `sizeThatFits`) as cross-checks. Nothing here reads
// private views or Apple binaries.
//
// Scene = query string, from the first launch argument, then from `Documents/scene.txt` (polled,
// like LGLab). After `settle` seconds the app writes `Documents/frames.json` and acknowledges the
// scene in `Documents/shown.txt`.
//   scene   buttons | type | toolbar | controls | search | list | alert | smenu | umenu | uikit | blank
//   scheme  light | dark       bg=RRGGBB (flat background)
//   buttons: style=glass|glassProminent|borderedProminent|bordered
//   alert:   n=1|2|3           umenu: open=content|bar|none  delay=<s>  close=<s>
import SwiftUI
import UIKit

// MARK: - Scene spec

struct Spec: Equatable {
    var query: [String: String]
    func string(_ key: String, _ fallback: String) -> String { query[key] ?? fallback }
    func number(_ key: String, _ fallback: Double) -> Double { query[key].flatMap(Double.init) ?? fallback }

    init(query: [String: String]) { self.query = query }
    init(url: URL) {
        var q: [String: String] = [:]
        for item in URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems ?? [] { q[item.name] = item.value ?? "" }
        self.init(query: q)
    }
    static func fromLaunch() -> Spec {
        let args = ProcessInfo.processInfo.arguments.dropFirst()
        if let first = args.first(where: { $0.contains("=") }), let url = URL(string: "ctllab://s?" + first) { return Spec(url: url) }
        return Spec(query: ["scene": "blank"])
    }
    var key: String { query.sorted(by: { $0.key < $1.key }).map { "\($0.key)=\($0.value)" }.joined(separator: "&") }
}

func hexColor(_ hex: String) -> Color {
    let v = UInt32(hex, radix: 16) ?? 0x808080
    return Color(.sRGB, red: Double((v >> 16) & 0xFF) / 255, green: Double((v >> 8) & 0xFF) / 255, blue: Double(v & 0xFF) / 255)
}

func hexUIColor(_ hex: String) -> UIColor {
    let v = UInt32(hex, radix: 16) ?? 0x808080
    return UIColor(red: CGFloat((v >> 16) & 0xFF) / 255, green: CGFloat((v >> 8) & 0xFF) / 255, blue: CGFloat(v & 0xFF) / 255, alpha: 1)
}

// MARK: - Frame reporting

@MainActor
final class FrameStore {
    static let shared = FrameStore()
    var frames: [String: [Double]] = [:]
    var extra: [String: Any] = [:]
    func reset() { frames = [:]; extra = [:] }
    func set(_ id: String, _ r: CGRect) { frames[id] = [r.minX, r.minY, r.width, r.height].map { (Double($0) * 1000).rounded() / 1000.0 } }
    func write(to url: URL) {
        var out: [String: Any] = ["frames": frames, "scale": UIScreen.main.scale,
                                  "screen": [UIScreen.main.bounds.width, UIScreen.main.bounds.height]]
        for (k, v) in extra { out[k] = v }
        if let data = try? JSONSerialization.data(withJSONObject: out, options: [.sortedKeys, .prettyPrinted]) { try? data.write(to: url) }
    }
}

extension View {
    func report(_ id: String) -> some View {
        onGeometryChange(for: CGRect.self) { $0.frame(in: .global) } action: { FrameStore.shared.set(id, $0) }
    }
}

// MARK: - Buttons

let sizes: [(String, ControlSize)] = [("mini", .mini), ("small", .small), ("regular", .regular), ("large", .large), ("extraLarge", .extraLarge)]

struct StyledButton<L: View>: View {
    let style: String
    @ViewBuilder let label: () -> L
    var body: some View {
        switch style {
        case "glassProminent": Button(action: {}, label: label).buttonStyle(.glassProminent)
        case "borderedProminent": Button(action: {}, label: label).buttonStyle(.borderedProminent)
        case "bordered": Button(action: {}, label: label).buttonStyle(.bordered)
        case "plain": Button(action: {}, label: label).buttonStyle(.plain)
        default: Button(action: {}, label: label).buttonStyle(.glass)
        }
    }
}

struct ButtonsScene: View {
    let spec: Spec
    var body: some View {
        let style = spec.string("style", "glass")
        VStack(alignment: .leading, spacing: 44) {
            ForEach(sizes, id: \.0) { name, size in
                HStack(spacing: 24) {
                    StyledButton(style: style) { Text("HxH") }.fixedSize().report("\(name)-text")
                    StyledButton(style: style) { Label("HxH", systemImage: "square.fill") }.fixedSize().report("\(name)-label")
                    StyledButton(style: style) { Image(systemName: "square.fill") }.fixedSize().report("\(name)-icon")
                }
                .controlSize(size)
            }
        }
        .padding(.leading, 16)
        .padding(.top, 80)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

/// Reference text: the same strings at known sizes and weights, to identify control fonts from ink.
struct TypeScene: View {
    static let weights: [(String, Font.Weight)] = [("regular", .regular), ("medium", .medium), ("semibold", .semibold), ("bold", .bold)]
    static let sizes: [Int] = [11, 12, 13, 14, 15, 16, 17, 18, 20, 22]
    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            ForEach(Self.weights, id: \.0) { wname, weight in
                VStack(alignment: .leading, spacing: 14) {
                    ForEach(Self.sizes, id: \.self) { s in
                        Text("HxH").font(.system(size: CGFloat(s), weight: weight)).report("t-\(wname)-\(s)")
                    }
                    Image(systemName: "square.fill").font(.system(size: 17)).report("sym-17")
                    Image(systemName: "square.fill").font(.system(size: 15)).report("sym-15")
                    Image(systemName: "square.fill").font(.system(size: 13)).report("sym-13")
                    Image(systemName: "square.fill").font(.system(size: 20)).report("sym-20")
                    Image(systemName: "square.fill").font(.system(size: 22)).report("sym-22")
                }
            }
        }
        .padding(.top, 60).padding(.leading, 16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .foregroundStyle(.black)
    }
}

// MARK: - Bars

struct ToolbarScene: View {
    let spec: Spec
    var body: some View {
        NavigationStack {
            hexColor(spec.string("bg", "808080")).ignoresSafeArea()
                .navigationTitle("Title")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .topBarLeading) { Button(action: {}) { Image(systemName: "square.fill") } }
                    ToolbarItemGroup(placement: .topBarTrailing) {
                        Button(action: {}) { Image(systemName: "square.fill") }
                        Button(action: {}) { Image(systemName: "square.fill") }
                    }
                    ToolbarSpacer(.fixed, placement: .topBarTrailing)
                    ToolbarItem(placement: .topBarTrailing) { Button(action: {}) { Image(systemName: "square.fill") } }
                    ToolbarItem(placement: .bottomBar) { Button("Edit") {} }
                    ToolbarSpacer(.flexible, placement: .bottomBar)
                    ToolbarItemGroup(placement: .bottomBar) {
                        Button(action: {}) { Image(systemName: "square.fill") }
                        Button(action: {}) { Image(systemName: "square.fill") }
                    }
                    ToolbarSpacer(.fixed, placement: .bottomBar)
                    ToolbarItem(placement: .bottomBar) {
                        Button(action: {}) { Image(systemName: "checkmark") }.buttonStyle(.glassProminent)
                    }
                }
        }
    }
}

// MARK: - Inline controls

struct ControlsScene: View {
    let spec: Spec
    @State private var pick = 0
    @State private var on = true
    @State private var off = false
    @State private var value = 0.5
    @State private var text = ""
    @State private var text2 = "HxH"
    var body: some View {
        VStack(alignment: .leading, spacing: 36) {
            Picker("", selection: $pick) { Text("HxH").tag(0); Text("Two").tag(1); Text("Three").tag(2) }
                .pickerStyle(.segmented).frame(width: 300).report("segmented")
            HStack(spacing: 40) {
                Toggle("", isOn: $on).labelsHidden().report("toggle-on")
                Toggle("", isOn: $off).labelsHidden().report("toggle-off")
            }
            Slider(value: $value).frame(width: 300).report("slider")
            TextField("Placeholder", text: $text).textFieldStyle(.roundedBorder).frame(width: 300).report("textfield")
            TextField("Placeholder", text: $text2).textFieldStyle(.roundedBorder).frame(width: 300).report("textfield-filled")
            Picker("", selection: $pick) { Text("HxH").tag(0); Text("B").tag(1) }
                .pickerStyle(.segmented).frame(width: 300).controlSize(.large).report("segmented-large")
        }
        .padding(.leading, 40).padding(.top, 80)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

struct SearchScene: View {
    let spec: Spec
    @State private var query = ""
    var body: some View {
        NavigationStack {
            hexColor(spec.string("bg", "808080")).ignoresSafeArea()
                .navigationTitle("Title")
                .navigationBarTitleDisplayMode(.inline)
                .searchable(text: $query, placement: spec.string("place", "auto") == "nav" ? .navigationBarDrawer(displayMode: .always) : .automatic)
        }
    }
}

struct ListScene: View {
    var body: some View {
        List {
            Section("HxH") { Text("HxH"); Text("Row two"); Text("Row three") }
            Section { Text("HxH"); Label("Icon row", systemImage: "square.fill") }
        }
        .listStyle(.insetGrouped)
    }
}

// MARK: - Alert

struct AlertScene: View {
    let spec: Spec
    @State private var shown = false
    var body: some View {
        let n = Int(spec.number("n", 2))
        hexColor(spec.string("bg", "808080")).ignoresSafeArea()
            .alert("HxH", isPresented: $shown) {
                if n >= 3 { Button("Delete", role: .destructive) {} }
                if n >= 2 { Button("Cancel", role: .cancel) {} }
                Button("HxH") {}
            } message: { Text("HxH") }
            .task { try? await Task.sleep(nanoseconds: 300_000_000); shown = true }
    }
}

// MARK: - Menus (SwiftUI, opened by a tap from the host)

struct MenuItems: View {
    var body: some View {
        Button("HxH", systemImage: "square.fill") {}
        Button("Second item", systemImage: "circle.fill") {}
        Divider()
        Button("Third item") {}
        Button("Delete", systemImage: "trash", role: .destructive) {}
    }
}

struct SMenuScene: View {
    let spec: Spec
    var body: some View {
        NavigationStack {
            ZStack {
                hexColor(spec.string("bg", "808080")).ignoresSafeArea()
                Menu { MenuItems() } label: { Text("Menu") }
                    .buttonStyle(.glass).controlSize(.large).report("content-menu")
            }
            .navigationTitle("Title")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu { MenuItems() } label: { Image(systemName: "ellipsis") }
                }
            }
        }
    }
}

// MARK: - Menus (UIKit, opened programmatically)

final class MenuVC: UIViewController {
    var spec: Spec = Spec(query: [:])
    let button = UIButton(configuration: .glass())
    lazy var barItem = UIBarButtonItem(image: UIImage(systemName: "ellipsis"), menu: makeMenu())

    func makeMenu() -> UIMenu {
        UIMenu(children: [
            UIMenu(options: .displayInline, children: [
                UIAction(title: "HxH", image: UIImage(systemName: "square.fill")) { _ in },
                UIAction(title: "Second item", image: UIImage(systemName: "circle.fill")) { _ in },
            ]),
            UIAction(title: "Third item") { _ in },
            UIAction(title: "Delete", image: UIImage(systemName: "trash"), attributes: .destructive) { _ in },
        ])
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = hexUIColor(spec.string("bg", "808080"))
        title = "Title"
        navigationItem.rightBarButtonItem = barItem
        var config = UIButton.Configuration.glass()
        config.title = "Menu"
        config.buttonSize = .large
        button.configuration = config
        button.menu = makeMenu()
        button.showsMenuAsPrimaryAction = true
        button.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(button)
        NSLayoutConstraint.activate([
            button.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            button.centerYAnchor.constraint(equalTo: view.centerYAnchor, constant: CGFloat(spec.number("dy", 0))),
        ])
    }

    private var started = false

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        guard !started else { return }
        started = true
        FrameStore.shared.set("content-button", button.convert(button.bounds, to: nil))
        let open = spec.string("open", "none")
        let delay = spec.number("delay", 1.5)
        let close = spec.number("close", 0)
        guard open != "none" else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [self] in
            // the scene may have been replaced meanwhile: a detached button can't present
            guard button.window != nil else { return }
            if open == "content" { button.performPrimaryAction() }
            if close > 0 {
                DispatchQueue.main.asyncAfter(deadline: .now() + close) { [self] in
                    guard button.window != nil else { return }
                    button.contextMenuInteraction?.dismissMenu()
                }
            }
        }
    }
}

struct UMenuScene: UIViewControllerRepresentable {
    let spec: Spec
    func makeUIViewController(context: Context) -> UINavigationController {
        let vc = MenuVC()
        vc.spec = spec
        let nav = UINavigationController(rootViewController: vc)
        return nav
    }
    func updateUIViewController(_ vc: UINavigationController, context: Context) {}
}

// MARK: - UIKit public sizes

@MainActor
func uikitSizes() -> [String: Any] {
    func s(_ size: CGSize) -> [Double] { [Double(size.width), Double(size.height)] }
    var out: [String: Any] = [:]
    out["UISwitch.intrinsic"] = s(UISwitch().intrinsicContentSize)
    out["UISlider.intrinsic"] = s(UISlider().intrinsicContentSize)
    let seg = UISegmentedControl(items: ["HxH", "Two", "Three"])
    out["UISegmentedControl.intrinsic"] = s(seg.intrinsicContentSize)
    let tf = UITextField(); tf.borderStyle = .roundedRect; tf.text = "HxH"
    out["UITextField.roundedRect.intrinsic"] = s(tf.intrinsicContentSize)
    let sb = UISearchBar(); sb.sizeToFit()
    out["UISearchBar.sizeToFit"] = s(sb.bounds.size)
    let sizesUI: [(String, UIButton.Configuration.Size)] = [("mini", .mini), ("small", .small), ("medium", .medium), ("large", .large)]
    let configs: [(String, () -> UIButton.Configuration)] = [
        ("glass", { .glass() }), ("prominentGlass", { .prominentGlass() }),
        ("filled", { .filled() }), ("tinted", { .tinted() }), ("gray", { .gray() }),
    ]
    for (cname, make) in configs {
        for (sname, size) in sizesUI {
            var c = make(); c.title = "HxH"; c.buttonSize = size
            out["UIButton.\(cname).\(sname).text"] = s(UIButton(configuration: c).intrinsicContentSize)
            var ci = make(); ci.image = UIImage(systemName: "square.fill"); ci.buttonSize = size
            out["UIButton.\(cname).\(sname).icon"] = s(UIButton(configuration: ci).intrinsicContentSize)
        }
    }
    return out
}

// MARK: - Root

struct RootView: View {
    let spec: Spec
    var body: some View {
        let scene = spec.string("scene", "blank")
        ZStack(alignment: .topLeading) {
            hexColor(spec.string("bg", "808080")).ignoresSafeArea()
            switch scene {
            case "buttons": ButtonsScene(spec: spec)
            case "type": TypeScene()
            case "toolbar": ToolbarScene(spec: spec)
            case "controls": ControlsScene(spec: spec)
            case "search": SearchScene(spec: spec)
            case "list": ListScene()
            case "alert": AlertScene(spec: spec)
            case "smenu": SMenuScene(spec: spec)
            case "umenu": UMenuScene(spec: spec).ignoresSafeArea()
            default: EmptyView()
            }
        }
        .statusBarHidden(spec.string("status", "hidden") == "hidden")
        .persistentSystemOverlays(.hidden)
        .preferredColorScheme(spec.string("scheme", "light") == "dark" ? .dark : .light)
    }
}

@main
struct CtlLabApp: App {
    @State private var spec = Spec.fromLaunch()

    var body: some Scene {
        WindowGroup {
            RootView(spec: spec)
                .id(spec.key)
                .task { await poll() }
        }
    }

    @MainActor
    func poll() async {
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let scene = docs.appendingPathComponent("scene.txt")
        let shown = docs.appendingPathComponent("shown.txt")
        let framesURL = docs.appendingPathComponent("frames.json")
        var last = ""
        while true {
            try? await Task.sleep(nanoseconds: 50_000_000)
            guard let text = try? String(contentsOf: scene, encoding: .utf8) else { continue }
            let query = text.trimmingCharacters(in: .whitespacesAndNewlines)
            guard query != last, let url = URL(string: "ctllab://s?" + query) else { continue }
            last = query
            FrameStore.shared.reset()
            spec = Spec(url: url)
            let settle = Double(spec.query["settle"] ?? "") ?? 1.0
            try? await Task.sleep(nanoseconds: UInt64(settle * 1_000_000_000))
            if spec.string("scene", "") == "uikit" { FrameStore.shared.extra["uikit"] = uikitSizes() }
            FrameStore.shared.write(to: framesURL)
            try? query.write(to: shown, atomically: true, encoding: .utf8)
        }
    }
}
