# C++ Expert — Best Practices

Reference material for the `cpp-expert` skill. See [SKILL.md](../SKILL.md).

## Best Practices

### RAII

```cpp
// ❌ Bad: Manual resource management
void process_file() {
    FILE* f = fopen("data.txt", "r");
    // ... work with file
    fclose(f); // Easy to forget
}

// ✅ Good: RAII with smart pointers
void process_file() {
    auto file = std::unique_ptr<FILE, decltype(&fclose)>(
        fopen("data.txt", "r"),
        &fclose
    );
    // ... work with file
    // Automatically closed when leaving scope
}
```

### Const Correctness

```cpp
class Data {
    int value;

public:
    // Const method
    int get_value() const { return value; }

    // Non-const method
    void set_value(int v) { value = v; }
};

// Const reference parameter
void process(const Data& data) {
    int v = data.get_value(); // OK
    // data.set_value(42); // Error: cannot modify const object
}
```

### Rule of Zero/Three/Five

- **Rule of Zero**: If you don't manage resources, don't declare special members
- **Rule of Three**: If you declare destructor, copy constructor, or copy assignment, declare all three
- **Rule of Five**: Add move constructor and move assignment
