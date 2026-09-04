# Swift Expert — Swift Syntax

Reference material for the `swift-expert` skill. See [SKILL.md](../SKILL.md).

## Swift Syntax

### Basics and Optionals

```swift
// Variables and constants
var mutableValue = 42
let constantValue = 100

// Optionals
var optionalName: String? = "Alice"

// Optional binding
if let name = optionalName {
    print("Hello, \(name)")
}

// Optional chaining
let length = optionalName?.count

// Nil coalescing
let displayName = optionalName ?? "Unknown"

// Guard statement
func greet(person: String?) {
    guard let name = person else {
        print("No name provided")
        return
    }
    print("Hello, \(name)")
}
```

### Functions and Closures

```swift
// Function with labeled parameters
func greet(person: String, from hometown: String) -> String {
    return "Hello \(person) from \(hometown)!"
}

// Closures
let numbers = [1, 2, 3, 4, 5]
let doubled = numbers.map { $0 * 2 }
let evens = numbers.filter { $0 % 2 == 0 }
let sum = numbers.reduce(0, +)

// Trailing closure
numbers.forEach { number in
    print(number)
}

// Capture values
func makeIncrementer(step: Int) -> () -> Int {
    var total = 0
    return {
        total += step
        return total
    }
}
```

### Structs and Classes

```swift
// Struct (value type, preferred)
struct User {
    let id: UUID
    var name: String
    var email: String

    // Computed property
    var displayName: String {
        name.isEmpty ? "Anonymous" : name
    }

    // Method
    mutating func updateEmail(_ newEmail: String) {
        email = newEmail
    }
}

// Class (reference type)
class ViewController {
    var title: String?
    weak var delegate: ViewControllerDelegate?

    init(title: String?) {
        self.title = title
    }

    deinit {
        print("Deallocated")
    }
}

// Protocol
protocol Identifiable {
    var id: UUID { get }
}

extension User: Identifiable {}
```

### Enums

```swift
// Simple enum
enum Direction {
    case north, south, east, west
}

// Associated values
enum Result<Success, Failure: Error> {
    case success(Success)
    case failure(Failure)
}

// Raw values
enum StatusCode: Int {
    case ok = 200
    case notFound = 404
    case serverError = 500
}

// Pattern matching
switch result {
case .success(let value):
    print("Success: \(value)")
case .failure(let error):
    print("Error: \(error)")
}
```

### Async/Await (Swift 5.5+)

```swift
// Async function
func fetchUser(id: String) async throws -> User {
    let url = URL(string: "https://api.example.com/users/\(id)")!
    let (data, _) = try await URLSession.shared.data(from: url)
    return try JSONDecoder().decode(User.self, from: data)
}

// Call async function
Task {
    do {
        let user = try await fetchUser(id: "123")
        print(user.name)
    } catch {
        print("Error: \(error)")
    }
}

// Parallel execution with async let
func loadUserData(id: String) async throws -> (User, [Post], [Comment]) {
    async let user = fetchUser(id: id)
    async let posts = fetchPosts(userId: id)
    async let comments = fetchComments(userId: id)

    return try await (user, posts, comments)
}

// Task groups for dynamic parallelism
func fetchMultipleUsers(ids: [String]) async throws -> [User] {
    try await withThrowingTaskGroup(of: User.self) { group in
        for id in ids {
            group.addTask {
                try await fetchUser(id: id)
            }
        }

        var users: [User] = []
        for try await user in group {
            users.append(user)
        }
        return users
    }
}
```

### Actors (Thread Safety)

```swift
actor BankAccount {
    private var balance: Double = 0

    func deposit(amount: Double) {
        balance += amount
    }

    func withdraw(amount: Double) throws {
        guard balance >= amount else {
            throw BankError.insufficientFunds
        }
        balance -= amount
    }

    func getBalance() -> Double {
        balance
    }
}

// Usage (all access is async and serialized)
let account = BankAccount()
Task {
    await account.deposit(amount: 100)
    let balance = await account.getBalance()
    print(balance)
}
```
