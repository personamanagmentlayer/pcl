# C++ Expert — Modern C++ Syntax

Reference material for the `cpp-expert` skill. See [SKILL.md](../SKILL.md).

## Modern C++ Syntax

### Concepts (C++20)

```cpp
#include <concepts>
#include <iostream>
#include <vector>

// Define concepts
template<typename T>
concept Numeric = std::integral<T> || std::floating_point<T>;

template<typename T>
concept Printable = requires(T t, std::ostream& os) {
    { os << t } -> std::same_as<std::ostream&>;
};

// Use concepts
template<Numeric T>
T add(T a, T b) {
    return a + b;
}

template<Printable T>
void print(const T& value) {
    std::cout << value << '\n';
}

// Concept with multiple requirements
template<typename T>
concept Container = requires(T container) {
    typename T::value_type;
    { container.begin() } -> std::same_as<typename T::iterator>;
    { container.end() } -> std::same_as<typename T::iterator>;
    { container.size() } -> std::convertible_to<std::size_t>;
};

template<Container C>
void process(const C& container) {
    for (const auto& item : container) {
        std::cout << item << ' ';
    }
}
```

### Ranges and Views (C++20)

```cpp
#include <ranges>
#include <vector>
#include <algorithm>

// Ranges
std::vector<int> numbers = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10};

// Filter and transform with views
auto even_squares = numbers
    | std::views::filter([](int n) { return n % 2 == 0; })
    | std::views::transform([](int n) { return n * n; });

for (int value : even_squares) {
    std::cout << value << ' '; // 4 16 36 64 100
}

// Take first N elements
auto first_three = numbers | std::views::take(3);

// Drop first N elements
auto skip_two = numbers | std::views::drop(2);

// Reverse
auto reversed = numbers | std::views::reverse;

// Join multiple ranges
std::vector<std::vector<int>> nested = {{1, 2}, {3, 4}, {5, 6}};
auto flattened = nested | std::views::join;

// Split string
std::string text = "one,two,three";
auto words = text | std::views::split(',');

// Lazy evaluation - nothing computed yet
auto lazy = numbers
    | std::views::filter([](int n) { return n > 5; })
    | std::views::transform([](int n) { return n * 2; })
    | std::views::take(3);

// Computation happens here
std::vector<int> result(lazy.begin(), lazy.end()); // {12, 14, 16}
```

### Coroutines (C++20)

```cpp
#include <coroutine>
#include <iostream>
#include <stdexcept>

// Generator coroutine
template<typename T>
class Generator {
public:
    struct promise_type {
        T current_value;

        auto get_return_object() {
            return Generator{std::coroutine_handle<promise_type>::from_promise(*this)};
        }

        auto initial_suspend() { return std::suspend_always{}; }
        auto final_suspend() noexcept { return std::suspend_always{}; }

        auto yield_value(T value) {
            current_value = value;
            return std::suspend_always{};
        }

        void return_void() {}
        void unhandled_exception() { std::terminate(); }
    };

    explicit Generator(std::coroutine_handle<promise_type> h) : handle(h) {}
    ~Generator() { if (handle) handle.destroy(); }

    bool next() {
        handle.resume();
        return !handle.done();
    }

    T value() const {
        return handle.promise().current_value;
    }

private:
    std::coroutine_handle<promise_type> handle;
};

// Use generator
Generator<int> fibonacci() {
    int a = 0, b = 1;
    while (true) {
        co_yield a;
        auto next = a + b;
        a = b;
        b = next;
    }
}

int main() {
    auto fib = fibonacci();
    for (int i = 0; i < 10; ++i) {
        fib.next();
        std::cout << fib.value() << ' '; // 0 1 1 2 3 5 8 13 21 34
    }
}
```

### Smart Pointers

```cpp
#include <memory>
#include <vector>

class Resource {
    int* data;
public:
    Resource(int size) : data(new int[size]) {
        std::cout << "Resource acquired\n";
    }

    ~Resource() {
        delete[] data;
        std::cout << "Resource released\n";
    }
};

// unique_ptr - exclusive ownership
std::unique_ptr<Resource> create_resource() {
    return std::make_unique<Resource>(100);
}

auto resource = create_resource();
// resource.reset(); // Manually release
// auto copy = resource; // Error: cannot copy unique_ptr
auto moved = std::move(resource); // Transfer ownership

// shared_ptr - shared ownership
std::shared_ptr<Resource> shared = std::make_shared<Resource>(100);
{
    std::shared_ptr<Resource> shared2 = shared; // Reference count = 2
    std::cout << "Use count: " << shared.use_count() << '\n'; // 2
} // shared2 destroyed, ref count = 1
// shared destroyed, Resource released

// weak_ptr - non-owning reference
std::weak_ptr<Resource> weak = shared;
if (auto locked = weak.lock()) {
    // Use resource
}

// Custom deleter
auto file_deleter = [](FILE* f) { if (f) fclose(f); };
std::unique_ptr<FILE, decltype(file_deleter)> file(
    fopen("data.txt", "r"),
    file_deleter
);
```

### Move Semantics

```cpp
#include <utility>
#include <vector>

class Buffer {
    int* data;
    size_t size;

public:
    // Constructor
    Buffer(size_t s) : size(s), data(new int[s]) {
        std::cout << "Constructor\n";
    }

    // Destructor
    ~Buffer() {
        delete[] data;
        std::cout << "Destructor\n";
    }

    // Copy constructor
    Buffer(const Buffer& other) : size(other.size), data(new int[other.size]) {
        std::copy(other.data, other.data + size, data);
        std::cout << "Copy constructor\n";
    }

    // Move constructor
    Buffer(Buffer&& other) noexcept : size(other.size), data(other.data) {
        other.data = nullptr;
        other.size = 0;
        std::cout << "Move constructor\n";
    }

    // Copy assignment
    Buffer& operator=(const Buffer& other) {
        if (this != &other) {
            delete[] data;
            size = other.size;
            data = new int[size];
            std::copy(other.data, other.data + size, data);
            std::cout << "Copy assignment\n";
        }
        return *this;
    }

    // Move assignment
    Buffer& operator=(Buffer&& other) noexcept {
        if (this != &other) {
            delete[] data;
            data = other.data;
            size = other.size;
            other.data = nullptr;
            other.size = 0;
            std::cout << "Move assignment\n";
        }
        return *this;
    }
};

// Perfect forwarding
template<typename T, typename... Args>
std::unique_ptr<T> make_unique_custom(Args&&... args) {
    return std::unique_ptr<T>(new T(std::forward<Args>(args)...));
}
```

### Templates and Metaprogramming

```cpp
#include <type_traits>
#include <iostream>

// Function template
template<typename T>
T max(T a, T b) {
    return (a > b) ? a : b;
}

// Class template
template<typename T, size_t N>
class Array {
    T data[N];

public:
    constexpr size_t size() const { return N; }

    T& operator[](size_t index) { return data[index]; }
    const T& operator[](size_t index) const { return data[index]; }
};

// Variadic templates
template<typename... Args>
void print(Args... args) {
    ((std::cout << args << ' '), ...); // Fold expression (C++17)
    std::cout << '\n';
}

// SFINAE (Substitution Failure Is Not An Error)
template<typename T>
typename std::enable_if<std::is_integral<T>::value, T>::type
abs(T value) {
    return value < 0 ? -value : value;
}

template<typename T>
typename std::enable_if<std::is_floating_point<T>::value, T>::type
abs(T value) {
    return std::fabs(value);
}

// Type traits
template<typename T>
void check_type() {
    std::cout << std::boolalpha;
    std::cout << "is_integral: " << std::is_integral_v<T> << '\n';
    std::cout << "is_floating_point: " << std::is_floating_point_v<T> << '\n';
    std::cout << "is_pointer: " << std::is_pointer_v<T> << '\n';
}

// Compile-time computation
constexpr int factorial(int n) {
    return n <= 1 ? 1 : n * factorial(n - 1);
}

constexpr int fact10 = factorial(10); // Computed at compile time
```

### std::format (C++20)

```cpp
#include <format>
#include <iostream>

int main() {
    int age = 30;
    std::string name = "Alice";

    // Basic formatting
    std::cout << std::format("Hello, {}!", name) << '\n';

    // Positional arguments
    std::cout << std::format("{1} is {0} years old", age, name) << '\n';

    // Format specifiers
    double pi = 3.14159265359;
    std::cout << std::format("Pi: {:.2f}", pi) << '\n'; // 3.14

    // Width and alignment
    std::cout << std::format("{:<10} {:>10}", "left", "right") << '\n';

    // Numbers
    int num = 42;
    std::cout << std::format("Dec: {0:d}, Hex: {0:x}, Bin: {0:b}", num) << '\n';

    // Padding
    std::cout << std::format("{:0>5}", num) << '\n'; // 00042

    return 0;
}
```
