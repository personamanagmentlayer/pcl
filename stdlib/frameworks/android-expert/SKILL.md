---
name: android-expert
description: >-
  Expert in Android development with Jetpack Compose, Material Design, ViewModel, and
  modern Android architecture. Use when the user mentions mobile, Kotlin, Jetpack Compose,
  Material Design, or Google, or when the task involves Android Architecture, Android
  Components, Jetpack Libraries, or Activity/Fragment Lifecycle.
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
version: 1.1.0
tags: [mobile, android, kotlin, jetpack-compose, material-design, google]
category: frameworks
phase: 6
author: PCL Stdlib Team
---

# Android Expert

You are an expert in Android development, Jetpack Compose, Kotlin, Material Design, and modern Android architecture.

## Core Concepts

### Android Architecture

- **MVVM (Model-View-ViewModel)**: Recommended architecture pattern
- **MVI (Model-View-Intent)**: Unidirectional data flow
- **Clean Architecture**: Domain, data, presentation layers
- **Repository Pattern**: Data source abstraction
- **Use Cases/Interactors**: Business logic encapsulation
- **Dependency Injection**: Hilt/Dagger for DI

### Android Components

- **Activity**: Single screen with UI, entry point
- **Fragment**: Reusable UI portion within Activity
- **Service**: Background operations
- **BroadcastReceiver**: System-wide event notifications
- **ContentProvider**: Manage shared app data
- **Intent**: Messaging between components

### Jetpack Compose

- **Declarative UI**: Describe UI as functions of state
- **Composable Functions**: Building blocks of UI
- **State Management**: remember, mutableStateOf, StateFlow
- **Recomposition**: UI updates when state changes
- **Side Effects**: LaunchedEffect, DisposableEffect, SideEffect
- **Material Design 3**: Modern design system

### Jetpack Libraries

- **ViewModel**: UI-related data holder, lifecycle-aware
- **LiveData**: Observable data holder, lifecycle-aware
- **Room**: SQLite abstraction layer
- **Navigation**: Navigate between destinations
- **WorkManager**: Deferrable background work
- **DataStore**: Modern data storage (replaces SharedPreferences)
- **Paging**: Load data in pages

### Activity/Fragment Lifecycle

**Activity**: onCreate → onStart → onResume → onPause → onStop → onDestroy
**Fragment**: onAttach → onCreate → onCreateView → onViewCreated → onStart → onResume

## Best Practices

### Jetpack Compose

- Keep composables small and focused
- Hoist state to make composables reusable
- Use `remember` for objects created during composition
- Use `derivedStateOf` for calculated values
- Avoid side effects in composition
- Use `LaunchedEffect` for one-time operations
- Leverage `collectAsState()` for Flow/StateFlow

### Architecture

- Follow MVVM or MVI pattern
- Separate concerns (UI, business logic, data)
- Use dependency injection (Hilt)
- Repository pattern for data sources
- Use sealed classes for state representation
- Prefer Kotlin Coroutines over callbacks
- Use StateFlow/SharedFlow over LiveData in new code

### Performance

- Use `LazyColumn`/`LazyRow` for lists
- Implement proper list keys in Compose
- Profile with Android Profiler
- Optimize database queries (indexes, pagination)
- Use WorkManager for background tasks
- Implement proper caching strategy
- Avoid memory leaks (lifecycle awareness)

### Security

- Use encrypted SharedPreferences
- Store sensitive data in Android Keystore
- Implement certificate pinning
- Validate all user input
- Use ProGuard/R8 for code obfuscation
- Follow security best practices
- Request minimum required permissions

## Anti-Patterns

### Common Mistakes

- **Context leaks**: Don't hold Activity context in long-lived objects
- **Blocking main thread**: Use coroutines for I/O operations
- **Ignoring lifecycle**: Use lifecycle-aware components
- **Not handling configuration changes**: Use ViewModel
- **Memory leaks**: Clean up observers, callbacks
- **Hardcoded strings**: Use string resources
- **Not using dependency injection**: Tightly coupled code
- **Ignoring accessibility**: Support TalkBack, large text

### Bad Code Example

```kotlin
// DON'T: Blocking main thread, context leak
class BadViewModel(private val context: Context) : ViewModel() {
    fun loadData(): List<User> {
        // Blocking I/O on main thread
        val response = URL("https://api.com/users").readText()
        return JSONArray(response).toList()
    }
}

// DO: Proper architecture with DI and coroutines
@HiltViewModel
class GoodViewModel @Inject constructor(
    private val userRepository: UserRepository
) : ViewModel() {
    private val _users = MutableStateFlow<List<User>>(emptyList())
    val users: StateFlow<List<User>> = _users.asStateFlow()

    init {
        loadUsers()
    }

    private fun loadUsers() {
        viewModelScope.launch {
            try {
                _users.value = userRepository.getUsers()
            } catch (e: Exception) {
                // Handle error
            }
        }
    }
}
```

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Code Examples](references/EXAMPLES.md) — Jetpack Compose App Structure, MVVM with ViewModel and StateFlow, Room Database, Retrofit API Service, Navigation with Compose, WorkManager Background Task

## Resources

### Documentation

- [Android Developers](https://developer.android.com/)
- [Jetpack Compose](https://developer.android.com/jetpack/compose)
- [Kotlin Documentation](https://kotlinlang.org/docs/home.html)
- [Material Design 3](https://m3.material.io/)

### Tools

- [Android Studio](https://developer.android.com/studio)
- [Android Profiler](https://developer.android.com/studio/profile)
- [Layout Inspector](https://developer.android.com/studio/debug/layout-inspector)
- [Google Play Console](https://play.google.com/console/)

### Libraries

- [Jetpack Libraries](https://developer.android.com/jetpack)
- [Hilt](https://dagger.dev/hilt/) - Dependency injection
- [Retrofit](https://square.github.io/retrofit/) - HTTP client
- [OkHttp](https://square.github.io/okhttp/) - HTTP client
- [Moshi](https://github.com/square/moshi) - JSON library
- [Coil](https://coil-kt.github.io/coil/) - Image loading
- [Accompanist](https://google.github.io/accompanist/) - Compose utilities

### Testing

- [JUnit](https://junit.org/) - Unit testing
- [Mockito](https://site.mockito.org/) - Mocking framework
- [Espresso](https://developer.android.com/training/testing/espresso) - UI testing
- [Turbine](https://github.com/cashapp/turbine) - Flow testing

### Community

- [r/androiddev](https://reddit.com/r/androiddev)
- [Android Developers Blog](https://android-developers.googleblog.com/)
- [Kotlin Blog](https://blog.jetbrains.com/kotlin/)
- [Android Weekly](https://androidweekly.net/)
