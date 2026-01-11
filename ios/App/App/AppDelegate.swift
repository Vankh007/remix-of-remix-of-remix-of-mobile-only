import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Setup screen recording protection
        setupScreenProtection()
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Triggered when the user screenshots
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
    }

    func applicationWillTerminate(_ application: UIApplication) {
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    // MARK: - Screen Recording Protection
    
    func setupScreenProtection() {
        if #available(iOS 11.0, *) {
            // Monitor for screen recording
            NotificationCenter.default.addObserver(
                self,
                selector: #selector(screenCaptureStatusChanged),
                name: UIScreen.capturedDidChangeNotification,
                object: nil
            )
            
            // Check initial state
            checkScreenRecording()
        }
        
        // Monitor for screenshots
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(userDidTakeScreenshot),
            name: UIApplication.userDidTakeScreenshotNotification,
            object: nil
        )
    }
    
    @objc func screenCaptureStatusChanged() {
        checkScreenRecording()
    }
    
    func checkScreenRecording() {
        if #available(iOS 11.0, *) {
            let isCaptured = UIScreen.main.isCaptured
            
            DispatchQueue.main.async {
                if let bridge = (self.window?.rootViewController as? CAPBridgeViewController)?.bridge {
                    if isCaptured {
                        // Screen recording detected - notify web app
                        bridge.webView?.evaluateJavaScript(
                            "window.dispatchEvent(new CustomEvent('screen-recording-detected'))",
                            completionHandler: nil
                        )
                        
                        // Optionally add a blur overlay
                        self.addBlurOverlay()
                    } else {
                        // Screen recording stopped
                        bridge.webView?.evaluateJavaScript(
                            "window.dispatchEvent(new CustomEvent('screen-recording-stopped'))",
                            completionHandler: nil
                        )
                        
                        self.removeBlurOverlay()
                    }
                }
            }
        }
    }
    
    @objc func userDidTakeScreenshot() {
        // User took a screenshot - you can log this or take action
        if let bridge = (self.window?.rootViewController as? CAPBridgeViewController)?.bridge {
            bridge.webView?.evaluateJavaScript(
                "window.dispatchEvent(new CustomEvent('screenshot-detected'))",
                completionHandler: nil
            )
        }
    }
    
    private var blurView: UIVisualEffectView?
    
    func addBlurOverlay() {
        guard blurView == nil else { return }
        
        let blurEffect = UIBlurEffect(style: .dark)
        let blurEffectView = UIVisualEffectView(effect: blurEffect)
        blurEffectView.frame = window?.bounds ?? .zero
        blurEffectView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        
        window?.addSubview(blurEffectView)
        blurView = blurEffectView
    }
    
    func removeBlurOverlay() {
        blurView?.removeFromSuperview()
        blurView = nil
    }
}
