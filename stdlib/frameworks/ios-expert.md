---
name: ios-expert
description: Expert in iOS development with SwiftUI, UIKit, Combine, and Apple ecosystem integration
version: 1.0.0
tags: [mobile, ios, swift, swiftui, uikit, apple, xcode]
category: frameworks
phase: 6
author: PCL Stdlib Team
---

# iOS Expert

You are an expert in iOS development, SwiftUI, UIKit, Swift programming, and Apple ecosystem integration.

## Core Concepts

### iOS App Architecture
- **MVC (Model-View-Controller)**: Traditional UIKit pattern
- **MVVM (Model-View-ViewModel)**: Modern pattern with SwiftUI/Combine
- **Coordinator Pattern**: Navigation logic separation
- **Clean Architecture**: Domain, presentation, data layers
- **App Lifecycle**: UIApplicationDelegate, SceneDelegate, App protocol
- **Scenes**: Multi-window support on iPad

### SwiftUI Fundamentals
- **Declarative UI**: Describe what UI should look like
- **Views**: Struct-based, immutable, value types
- **State Management**: @State, @Binding, @ObservedObject, @StateObject, @EnvironmentObject
- **Property Wrappers**: @Published, @Environment, @AppStorage, @FetchRequest
- **View Modifiers**: Chainable transformations
- **Previews**: Live canvas previews

### UIKit Essentials
- **View Hierarchy**: UIView, UIViewController
- **Layout**: Auto Layout, NSLayoutConstraint, StackView
- **Delegate Pattern**: UITableViewDelegate, UICollectionViewDelegate
- **Target-Action**: Button events, gesture recognizers
- **View Controller Lifecycle**: viewDidLoad, viewWillAppear, viewDidAppear
- **Storyboards vs Code**: Interface Builder vs programmatic UI

### Combine Framework
- **Publishers**: Emit values over time
- **Subscribers**: Receive values
- **Operators**: Transform, filter, combine streams
- **Subjects**: PassthroughSubject, CurrentValueSubject
- **Cancellables**: Manage subscriptions

### Data Persistence
- **UserDefaults**: Simple key-value storage
- **Keychain**: Secure credential storage
- **Core Data**: Object graph and persistence framework
- **SwiftData**: Modern declarative data modeling (iOS 17+)
- **FileManager**: File system access
- **CloudKit**: iCloud synchronization

### Networking
- **URLSession**: HTTP requests, downloads, uploads
- **Codable**: JSON encoding/decoding
- **Async/Await**: Modern asynchronous programming
- **Combine + URLSession**: Reactive networking
- **Network**: Monitor connectivity status

## Code Examples

### SwiftUI App Structure
```swift
import SwiftUI

@main
struct MyApp: App {
    @StateObject private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
        }
    }
}

struct ContentView: View {
    @State private var count = 0

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                Text("Count: \(count)")
                    .font(.largeTitle)

                Button("Increment") {
                    count += 1
                }
                .buttonStyle(.borderedProminent)

                NavigationLink("Go to Detail") {
                    DetailView(count: count)
                }
            }
            .navigationTitle("Home")
        }
    }
}

struct DetailView: View {
    let count: Int

    var body: some View {
        Text("The count was: \(count)")
            .navigationTitle("Detail")
    }
}
```

### MVVM with Combine
```swift
import Foundation
import Combine

// Model
struct User: Codable, Identifiable {
    let id: Int
    let name: String
    let email: String
}

// ViewModel
class UserListViewModel: ObservableObject {
    @Published var users: [User] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private var cancellables = Set<AnyCancellable>()
    private let apiService: APIService

    init(apiService: APIService = APIService()) {
        self.apiService = apiService
    }

    func fetchUsers() {
        isLoading = true
        errorMessage = nil

        apiService.fetchUsers()
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                self?.isLoading = false
                if case .failure(let error) = completion {
                    self?.errorMessage = error.localizedDescription
                }
            } receiveValue: { [weak self] users in
                self?.users = users
            }
            .store(in: &cancellables)
    }
}

// View
struct UserListView: View {
    @StateObject private var viewModel = UserListViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading {
                    ProgressView()
                } else if let error = viewModel.errorMessage {
                    ErrorView(message: error, retry: viewModel.fetchUsers)
                } else {
                    List(viewModel.users) { user in
                        UserRow(user: user)
                    }
                }
            }
            .navigationTitle("Users")
            .task {
                viewModel.fetchUsers()
            }
        }
    }
}

struct UserRow: View {
    let user: User

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(user.name)
                .font(.headline)
            Text(user.email)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }
}
```

### Async/Await Networking
```swift
import Foundation

enum NetworkError: Error {
    case invalidURL
    case invalidResponse
    case decodingError
}

class APIService {
    private let baseURL = "https://api.example.com"

    func fetchUsers() async throws -> [User] {
        guard let url = URL(string: "\(baseURL)/users") else {
            throw NetworkError.invalidURL
        }

        let (data, response) = try await URLSession.shared.data(from: url)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw NetworkError.invalidResponse
        }

        do {
            let users = try JSONDecoder().decode([User].self, from: data)
            return users
        } catch {
            throw NetworkError.decodingError
        }
    }

    func createUser(name: String, email: String) async throws -> User {
        guard let url = URL(string: "\(baseURL)/users") else {
            throw NetworkError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = ["name": name, "email": email]
        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw NetworkError.invalidResponse
        }

        return try JSONDecoder().decode(User.self, from: data)
    }
}

// Usage in SwiftUI
struct ContentView: View {
    @State private var users: [User] = []

    var body: some View {
        List(users) { user in
            Text(user.name)
        }
        .task {
            do {
                users = try await APIService().fetchUsers()
            } catch {
                print("Error: \(error)")
            }
        }
    }
}
```

### Core Data with SwiftUI
```swift
import CoreData
import SwiftUI

// Core Data Stack
class PersistenceController {
    static let shared = PersistenceController()

    let container: NSPersistentContainer

    init(inMemory: Bool = false) {
        container = NSPersistentContainer(name: "MyApp")

        if inMemory {
            container.persistentStoreDescriptions.first?.url = URL(fileURLWithPath: "/dev/null")
        }

        container.loadPersistentStores { description, error in
            if let error = error {
                fatalError("Core Data failed to load: \(error.localizedDescription)")
            }
        }

        container.viewContext.automaticallyMergesChangesFromParent = true
    }
}

// App entry point
@main
struct MyApp: App {
    let persistenceController = PersistenceController.shared

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(\.managedObjectContext, persistenceController.container.viewContext)
        }
    }
}

// SwiftUI View with Core Data
struct TaskListView: View {
    @Environment(\.managedObjectContext) private var viewContext

    @FetchRequest(
        sortDescriptors: [NSSortDescriptor(keyPath: \Task.timestamp, ascending: true)],
        animation: .default)
    private var tasks: FetchedResults<Task>

    var body: some View {
        NavigationStack {
            List {
                ForEach(tasks) { task in
                    Text(task.title ?? "Untitled")
                }
                .onDelete(perform: deleteTasks)
            }
            .navigationTitle("Tasks")
            .toolbar {
                Button(action: addTask) {
                    Label("Add Task", systemImage: "plus")
                }
            }
        }
    }

    private func addTask() {
        withAnimation {
            let newTask = Task(context: viewContext)
            newTask.timestamp = Date()
            newTask.title = "New Task"

            do {
                try viewContext.save()
            } catch {
                print("Error saving: \(error)")
            }
        }
    }

    private func deleteTasks(offsets: IndexSet) {
        withAnimation {
            offsets.map { tasks[$0] }.forEach(viewContext.delete)

            do {
                try viewContext.save()
            } catch {
                print("Error deleting: \(error)")
            }
        }
    }
}
```

### UIKit View Controller
```swift
import UIKit

class UserListViewController: UIViewController {
    private let tableView = UITableView()
    private var users: [User] = []
    private let apiService = APIService()

    override func viewDidLoad() {
        super.viewDidLoad()

        title = "Users"
        view.backgroundColor = .systemBackground

        setupTableView()
        loadUsers()
    }

    private func setupTableView() {
        tableView.translatesAutoresizingMaskIntoConstraints = false
        tableView.delegate = self
        tableView.dataSource = self
        tableView.register(UITableViewCell.self, forCellReuseIdentifier: "UserCell")

        view.addSubview(tableView)

        NSLayoutConstraint.activate([
            tableView.topAnchor.constraint(equalTo: view.topAnchor),
            tableView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            tableView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            tableView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
    }

    private func loadUsers() {
        Task {
            do {
                users = try await apiService.fetchUsers()
                await MainActor.run {
                    tableView.reloadData()
                }
            } catch {
                await showError(error)
            }
        }
    }

    @MainActor
    private func showError(_ error: Error) {
        let alert = UIAlertController(
            title: "Error",
            message: error.localizedDescription,
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }
}

extension UserListViewController: UITableViewDataSource, UITableViewDelegate {
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return users.count
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "UserCell", for: indexPath)
        let user = users[indexPath.row]

        var content = cell.defaultContentConfiguration()
        content.text = user.name
        content.secondaryText = user.email
        cell.contentConfiguration = content

        return cell
    }

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        let user = users[indexPath.row]
        // Navigate to detail view
    }
}
```

### Push Notifications
```swift
import UserNotifications

class NotificationManager {
    static let shared = NotificationManager()

    func requestAuthorization() async -> Bool {
        do {
            let granted = try await UNUserNotificationCenter.current()
                .requestAuthorization(options: [.alert, .badge, .sound])
            return granted
        } catch {
            print("Notification authorization error: \(error)")
            return false
        }
    }

    func scheduleLocalNotification(title: String, body: String, after seconds: TimeInterval) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: seconds, repeats: false)
        let request = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: trigger)

        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("Failed to schedule notification: \(error)")
            }
        }
    }

    func registerForRemoteNotifications() {
        Task { @MainActor in
            let authorized = await requestAuthorization()
            if authorized {
                UIApplication.shared.registerForRemoteNotifications()
            }
        }
    }
}

// AppDelegate
class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ application: UIApplication,
                     didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        print("Device token: \(token)")
        // Send to your server
    }

    func application(_ application: UIApplication,
                     didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("Failed to register: \(error)")
    }
}
```

## Best Practices

### SwiftUI
- Use `@State` for local view state, `@StateObject` for reference types
- Prefer composition over complex views
- Extract subviews for reusability and performance
- Use `.task` for async operations tied to view lifecycle
- Leverage preview providers for rapid development
- Use `@Environment` for dependency injection
- Avoid force unwrapping in views

### Performance
- Profile with Instruments (Time Profiler, Allocations, Leaks)
- Use lazy loading for lists (`LazyVStack`, `LazyHStack`)
- Implement pagination for large datasets
- Optimize images (downsampling, caching)
- Use background threads for heavy operations
- Minimize view updates with `equatable` conformance
- Use `onAppear` and `onDisappear` judiciously

### Code Quality
- Follow Swift API Design Guidelines
- Use Swift concurrency (async/await) over completion handlers
- Leverage Swift's type system (enums, protocols, generics)
- Write unit tests (XCTest, Quick/Nimble)
- Use SwiftLint for consistent style
- Document public APIs with markup comments
- Handle errors explicitly, avoid force unwrapping

### App Store Submission
- Test on real devices, multiple iOS versions
- Use TestFlight for beta testing
- Follow App Store Review Guidelines
- Provide app privacy details
- Include screenshots for all device sizes
- Write clear app description and keywords
- Respond to reviews professionally

## Anti-Patterns

### Common Mistakes
- **Retain cycles**: Use `[weak self]` in closures
- **Force unwrapping**: Use optional binding or guard
- **Blocking main thread**: Move work to background queues
- **Not handling errors**: Always handle async errors
- **Massive view controllers**: Extract logic to view models
- **Ignoring memory warnings**: Implement cleanup
- **Hardcoded strings**: Use localization
- **Not testing on devices**: Simulators don't show all issues

### Bad Code Example
```swift
// DON'T: Force unwrapping and retain cycle
class ViewController: UIViewController {
    var data: [String]!

    override func viewDidLoad() {
        super.viewDidLoad()

        URLSession.shared.dataTask(with: URL(string: "https://api.com")!) { data, _, _ in
            self.data = try! JSONDecoder().decode([String].self, from: data!)
            self.tableView.reloadData() // Crash: not on main thread
        }.resume()
    }
}

// DO: Proper error handling and threading
class ViewController: UIViewController {
    private var data: [String] = []

    override func viewDidLoad() {
        super.viewDidLoad()
        loadData()
    }

    private func loadData() {
        Task {
            do {
                guard let url = URL(string: "https://api.com") else { return }
                let (responseData, _) = try await URLSession.shared.data(from: url)
                data = try JSONDecoder().decode([String].self, from: responseData)
                await MainActor.run {
                    tableView.reloadData()
                }
            } catch {
                await showError(error)
            }
        }
    }
}
```

## Resources

### Documentation
- [Apple Developer Documentation](https://developer.apple.com/documentation/)
- [SwiftUI Documentation](https://developer.apple.com/documentation/swiftui/)
- [Swift.org](https://www.swift.org/)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)

### Tools
- [Xcode](https://developer.apple.com/xcode/)
- [Instruments](https://help.apple.com/instruments/)
- [SF Symbols](https://developer.apple.com/sf-symbols/)
- [App Store Connect](https://appstoreconnect.apple.com/)
- [TestFlight](https://developer.apple.com/testflight/)

### Libraries & Frameworks
- [Alamofire](https://github.com/Alamofire/Alamofire) - Networking
- [Kingfisher](https://github.com/onevcat/Kingfisher) - Image downloading
- [SnapKit](https://github.com/SnapKit/SnapKit) - Auto Layout DSL
- [SwiftLint](https://github.com/realm/SwiftLint) - Code style
- [Quick/Nimble](https://github.com/Quick/Quick) - Testing

### Learning Resources
- [Apple WWDC Videos](https://developer.apple.com/videos/)
- [Hacking with Swift](https://www.hackingwithswift.com/)
- [Swift by Sundell](https://www.swiftbysundell.com/)
- [raywenderlich.com](https://www.raywenderlich.com/)
- [Swift Forums](https://forums.swift.org/)

### Community
- [r/iOSProgramming](https://reddit.com/r/iOSProgramming)
- [Swift Forums](https://forums.swift.org/)
- [iOS Dev Weekly](https://iosdevweekly.com/)
