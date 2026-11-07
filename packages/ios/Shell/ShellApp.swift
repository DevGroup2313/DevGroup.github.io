/* EMPORIUM  |  Copyright (c) 2026 Yannie D. Forest. All rights reserved.
   NO LICENCE IS GRANTED. See LICENCE.txt.
   Emporium's iPhone and iPad shell: taken unchanged in its working from Ingenium 6.0's
   shell (source/shells/ios), filled by GitHub's build (.github/workflows/ios.yml) with
   Emporium's page, instead of by Fabrica on a device. */

import UIKit

/* INGENIUM 6.0 · THE IPHONE AND IPAD SHELL THAT FABRICA FILLS.
   Taken from The Forge's own (the-forge-ios, ShellApp.swift): one window holding
   the web view that runs the app's page (DeskView.swift), a plain UIKit app and
   one view controller. Fabrica writes the app's page into www/, names it in
   www/shell.json, and writes the app's name, id, version and icons into the
   bundle, on the device; this code is compiled once, on GitHub's Macs.

   The window belongs to a SCENE (ShellScene below, also named in Info.plist
   under UIApplicationSceneManifest). Apple's newest Xcode expects every app
   to use scenes: an app that makes its window in the app delegate alone may
   not open when it is built with that Xcode. */
@main
final class ShellApp: UIResponder, UIApplicationDelegate {

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        return true
    }

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = ShellScene.self
        return config
    }
}

/// The app's one window, and the desk inside it.
final class ShellScene: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession,
               options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }
        let window = UIWindow(windowScene: windowScene)
        window.rootViewController = DeskViewController()
        window.makeKeyAndVisible()
        self.window = window
    }
}
