---
name: cpp-expert
version: 1.1.0
description: >-
  Expert-level C++ development with modern C++20/23, STL, memory management, and
  performance. Use when the user mentions C++, C++20, C++23, the STL, templates, or
  performance, or when the task involves Modern C++ Features, Memory Management, Ranges and
  Views, or Coroutines.
category: languages
tags: [cpp, c++, c++20, c++23, stl, templates, performance, memory]
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash(g++:*, clang++:*, cmake:*, make:*)
---

# C++ Expert

Expert guidance for modern C++ development including C++20/23 features, STL, templates, memory management, and high-performance programming.

## Core Concepts

### Modern C++ Features (C++20/23)

- Concepts and constraints
- Ranges and views
- Coroutines
- Modules
- Three-way comparison (spaceship operator)
- std::format
- std::span
- Designated initializers
- consteval and constinit

### Memory Management

- RAII (Resource Acquisition Is Initialization)
- Smart pointers (unique_ptr, shared_ptr, weak_ptr)
- Move semantics and perfect forwarding
- Memory allocation strategies
- Custom allocators
- Memory pools

### Performance

- Zero-cost abstractions
- Inline optimization
- Template metaprogramming
- Compile-time computation (constexpr)
- Cache-friendly data structures
- SIMD operations

## STL Containers

### Sequential Containers

```cpp
#include <vector>
#include <deque>
#include <list>
#include <array>

// vector - dynamic array
std::vector<int> vec = {1, 2, 3, 4, 5};
vec.push_back(6);
vec.emplace_back(7); // Construct in-place
vec.reserve(100); // Pre-allocate capacity

// deque - double-ended queue
std::deque<int> deq = {1, 2, 3};
deq.push_front(0);
deq.push_back(4);

// list - doubly-linked list
std::list<int> lst = {1, 2, 3};
lst.push_front(0);
lst.push_back(4);
lst.remove(2); // Remove all elements with value 2

// array - fixed-size array
std::array<int, 5> arr = {1, 2, 3, 4, 5};
```

### Associative Containers

```cpp
#include <map>
#include <set>
#include <unordered_map>
#include <unordered_set>

// map - ordered key-value pairs
std::map<std::string, int> ages;
ages["Alice"] = 30;
ages["Bob"] = 25;
ages.insert({"Charlie", 35});

// set - ordered unique elements
std::set<int> numbers = {3, 1, 4, 1, 5, 9};
numbers.insert(2);

// unordered_map - hash table
std::unordered_map<std::string, int> hash_map;
hash_map["key"] = 42;

// unordered_set - hash set
std::unordered_set<int> hash_set = {1, 2, 3};
```

## Algorithms

```cpp
#include <algorithm>
#include <numeric>
#include <vector>

std::vector<int> numbers = {5, 2, 8, 1, 9, 3, 7};

// Sorting
std::sort(numbers.begin(), numbers.end());
std::sort(numbers.begin(), numbers.end(), std::greater<int>());

// Searching
auto it = std::find(numbers.begin(), numbers.end(), 8);
bool found = std::binary_search(numbers.begin(), numbers.end(), 5);

// Transforming
std::vector<int> doubled(numbers.size());
std::transform(numbers.begin(), numbers.end(), doubled.begin(),
    [](int n) { return n * 2; });

// Filtering
std::vector<int> evens;
std::copy_if(numbers.begin(), numbers.end(), std::back_inserter(evens),
    [](int n) { return n % 2 == 0; });

// Accumulate
int sum = std::accumulate(numbers.begin(), numbers.end(), 0);
int product = std::accumulate(numbers.begin(), numbers.end(), 1,
    std::multiplies<int>());

// Partition
auto pivot = std::partition(numbers.begin(), numbers.end(),
    [](int n) { return n < 5; });

// Remove
numbers.erase(std::remove(numbers.begin(), numbers.end(), 5), numbers.end());

// Unique (remove consecutive duplicates)
std::sort(numbers.begin(), numbers.end());
numbers.erase(std::unique(numbers.begin(), numbers.end()), numbers.end());
```

## Concurrency

```cpp
#include <thread>
#include <mutex>
#include <future>
#include <atomic>

// Thread
void worker(int id) {
    std::cout << "Thread " << id << '\n';
}

std::thread t1(worker, 1);
std::thread t2(worker, 2);
t1.join();
t2.join();

// Mutex
std::mutex mtx;
int shared_data = 0;

void increment() {
    std::lock_guard<std::mutex> lock(mtx);
    ++shared_data;
}

// Atomic
std::atomic<int> counter{0};
counter++; // Thread-safe
counter.fetch_add(5);

// Future and promise
std::promise<int> prom;
std::future<int> fut = prom.get_future();

std::thread t([&prom]() {
    std::this_thread::sleep_for(std::chrono::seconds(1));
    prom.set_value(42);
});

int result = fut.get(); // Blocks until ready
t.join();

// async
auto future = std::async(std::launch::async, []() {
    return 42;
});

int value = future.get();
```

## Build Systems

### CMake

```cmake
# CMakeLists.txt
cmake_minimum_required(VERSION 3.20)
project(MyApp VERSION 1.0.0 LANGUAGES CXX)

# Set C++ standard
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Compiler flags
if(CMAKE_CXX_COMPILER_ID STREQUAL "GNU" OR CMAKE_CXX_COMPILER_ID STREQUAL "Clang")
    add_compile_options(-Wall -Wextra -Wpedantic -O3)
endif()

# Find packages
find_package(Threads REQUIRED)
find_package(Boost 1.75 REQUIRED COMPONENTS system filesystem)

# Add executable
add_executable(myapp
    src/main.cpp
    src/module.cpp
    include/module.h
)

# Include directories
target_include_directories(myapp PRIVATE include)

# Link libraries
target_link_libraries(myapp PRIVATE
    Threads::Threads
    Boost::system
    Boost::filesystem
)

# Install
install(TARGETS myapp DESTINATION bin)
```

## Anti-Patterns to Avoid

❌ **Raw pointers for ownership**: Use smart pointers
❌ **Manual memory management**: Use RAII
❌ **Using C-style arrays**: Use std::array or std::vector
❌ **Ignoring const correctness**: Mark everything const that can be
❌ **Unnecessary copies**: Use move semantics and references
❌ **Premature optimization**: Profile before optimizing
❌ **Using `new` without `delete`**: Use smart pointers

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Best Practices](references/BEST_PRACTICES.md) — RAII, Const Correctness, Rule of Zero/Three/Five
- [Modern C++ Syntax](references/MODERN_C_SYNTAX.md) — Concepts (C++20), Ranges and Views (C++20), Coroutines (C++20), Smart Pointers, Move Semantics, Templates and Metaprogramming, std::format (C++20)

## Resources

- C++ Reference: https://en.cppreference.com/
- C++ Core Guidelines: https://isocpp.github.io/CppCoreGuidelines/
- Compiler Explorer: https://godbolt.org/
- CPP Reference: https://cplusplus.com/
