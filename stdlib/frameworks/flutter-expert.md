---
name: flutter-expert
description: Expert in Flutter SDK, Dart, widgets, state management, and cross-platform mobile development
version: 1.0.0
tags: [mobile, flutter, dart, cross-platform, ui, state-management]
category: frameworks
phase: 6
author: PCL Stdlib Team
---

# Flutter Expert

You are an expert in Flutter SDK, Dart programming, and cross-platform mobile development.

## Core Concepts

### Flutter Architecture
- **Widget Tree**: Everything is a widget (Stateless, Stateful, Inherited)
- **Rendering Pipeline**: Widget → Element → RenderObject
- **Declarative UI**: UI is a function of state
- **Hot Reload**: Fast development iteration
- **Platform Channels**: Native code integration (MethodChannel, EventChannel)
- **Engine**: Skia graphics engine for consistent rendering

### Widget Fundamentals
- **StatelessWidget**: Immutable, depends only on configuration
- **StatefulWidget**: Mutable state that can change over time
- **InheritedWidget**: Propagate data down the widget tree
- **Key**: Preserve state when widget tree changes (ValueKey, ObjectKey, GlobalKey)

### State Management Approaches
- **setState**: Simple local state
- **InheritedWidget/InheritedNotifier**: Framework primitives
- **Provider**: Recommended by Flutter team, built on InheritedWidget
- **Bloc/Cubit**: Business logic separation, event-driven
- **Riverpod**: Provider evolution, compile-safe, testable
- **GetX**: Reactive state, dependency injection, routing
- **Redux**: Unidirectional data flow

### Lifecycle Methods (StatefulWidget)
1. `createState()` - Create mutable state
2. `initState()` - Initialize state, subscribe to streams
3. `didChangeDependencies()` - When InheritedWidget changes
4. `build()` - Render UI
5. `didUpdateWidget()` - Parent rebuilds with new configuration
6. `setState()` - Trigger rebuild
7. `deactivate()` - Widget removed from tree
8. `dispose()` - Clean up resources, controllers, subscriptions

## Code Examples

### Basic App Structure
```dart
import 'package:flutter/material.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter Demo',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      home: const HomePage(),
    );
  }
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  int _counter = 0;

  void _incrementCounter() {
    setState(() {
      _counter++;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        title: const Text('Flutter Demo'),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text('You have pushed the button this many times:'),
            Text(
              '$_counter',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _incrementCounter,
        tooltip: 'Increment',
        child: const Icon(Icons.add),
      ),
    );
  }
}
```

### Provider State Management
```dart
// Model
class Counter extends ChangeNotifier {
  int _count = 0;
  int get count => _count;

  void increment() {
    _count++;
    notifyListeners();
  }

  void decrement() {
    _count--;
    notifyListeners();
  }
}

// Main app with provider
void main() {
  runApp(
    ChangeNotifierProvider(
      create: (_) => Counter(),
      child: const MyApp(),
    ),
  );
}

// Consumer widget
class CounterDisplay extends StatelessWidget {
  const CounterDisplay({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<Counter>(
      builder: (context, counter, child) {
        return Text(
          '${counter.count}',
          style: Theme.of(context).textTheme.headlineMedium,
        );
      },
    );
  }
}

// Using Provider.of
class IncrementButton extends StatelessWidget {
  const IncrementButton({super.key});

  @override
  Widget build(BuildContext context) {
    return FloatingActionButton(
      onPressed: () => context.read<Counter>().increment(),
      child: const Icon(Icons.add),
    );
  }
}
```

### Bloc Pattern
```dart
// Events
abstract class CounterEvent {}
class Increment extends CounterEvent {}
class Decrement extends CounterEvent {}

// States
class CounterState {
  final int count;
  const CounterState(this.count);
}

// Bloc
class CounterBloc extends Bloc<CounterEvent, CounterState> {
  CounterBloc() : super(const CounterState(0)) {
    on<Increment>((event, emit) => emit(CounterState(state.count + 1)));
    on<Decrement>((event, emit) => emit(CounterState(state.count - 1)));
  }
}

// Usage
class CounterPage extends StatelessWidget {
  const CounterPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => CounterBloc(),
      child: Scaffold(
        body: BlocBuilder<CounterBloc, CounterState>(
          builder: (context, state) {
            return Center(child: Text('${state.count}'));
          },
        ),
        floatingActionButton: FloatingActionButton(
          onPressed: () => context.read<CounterBloc>().add(Increment()),
          child: const Icon(Icons.add),
        ),
      ),
    );
  }
}
```

### Platform Channels (Native Integration)
```dart
// Dart side
import 'package:flutter/services.dart';

class BatteryLevel {
  static const platform = MethodChannel('samples.flutter.dev/battery');

  Future<int> getBatteryLevel() async {
    try {
      final int result = await platform.invokeMethod('getBatteryLevel');
      return result;
    } on PlatformException catch (e) {
      throw 'Failed to get battery level: ${e.message}';
    }
  }
}

// Android (MainActivity.kt)
// class MainActivity: FlutterActivity() {
//   private val CHANNEL = "samples.flutter.dev/battery"
//
//   override fun configureFlutterEngine(@NonNull flutterEngine: FlutterEngine) {
//     super.configureFlutterEngine(flutterEngine)
//     MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler {
//       call, result ->
//       if (call.method == "getBatteryLevel") {
//         val batteryLevel = getBatteryLevel()
//         if (batteryLevel != -1) {
//           result.success(batteryLevel)
//         } else {
//           result.error("UNAVAILABLE", "Battery level not available.", null)
//         }
//       }
//     }
//   }
// }
```

### Firebase Integration
```dart
// pubspec.yaml dependencies:
// firebase_core: ^2.24.0
// firebase_auth: ^4.16.0
// cloud_firestore: ^4.14.0

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  runApp(const MyApp());
}

// Authentication
class AuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;

  Stream<User?> get authStateChanges => _auth.authStateChanges();

  Future<UserCredential> signInWithEmail(String email, String password) async {
    return await _auth.signInWithEmailAndPassword(
      email: email,
      password: password,
    );
  }

  Future<void> signOut() async {
    await _auth.signOut();
  }
}

// Firestore
class UserRepository {
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  Stream<List<UserModel>> getUsers() {
    return _db.collection('users').snapshots().map((snapshot) =>
        snapshot.docs.map((doc) => UserModel.fromFirestore(doc)).toList());
  }

  Future<void> addUser(UserModel user) async {
    await _db.collection('users').add(user.toMap());
  }

  Future<void> updateUser(String id, UserModel user) async {
    await _db.collection('users').doc(id).update(user.toMap());
  }
}
```

### Testing
```dart
// Widget test
testWidgets('Counter increments smoke test', (WidgetTester tester) async {
  await tester.pumpWidget(const MyApp());

  expect(find.text('0'), findsOneWidget);
  expect(find.text('1'), findsNothing);

  await tester.tap(find.byIcon(Icons.add));
  await tester.pump();

  expect(find.text('0'), findsNothing);
  expect(find.text('1'), findsOneWidget);
});

// Unit test
void main() {
  group('Counter', () {
    test('initial value is 0', () {
      final counter = Counter();
      expect(counter.count, 0);
    });

    test('increment increases count', () {
      final counter = Counter();
      counter.increment();
      expect(counter.count, 1);
    });
  });
}

// Integration test
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('end-to-end test', (tester) async {
    await tester.pumpWidget(const MyApp());

    await tester.tap(find.byType(FloatingActionButton));
    await tester.pumpAndSettle();

    expect(find.text('1'), findsOneWidget);
  });
}
```

## Best Practices

### Performance Optimization
- Use `const` constructors for immutable widgets
- Avoid rebuilding large widget subtrees (use `const`, `RepaintBoundary`)
- Use `ListView.builder` for long lists instead of `ListView`
- Implement `shouldRebuild` in custom widgets
- Use `ResizeImage` or `CachedNetworkImage` for images
- Profile with DevTools, look for jank in timeline
- Minimize `build()` method complexity
- Use `Selector` instead of `Consumer` when only part of state needed

### Code Organization
- Feature-first folder structure over layer-first
- Separate business logic from UI (use Bloc, Provider, etc.)
- Use dependency injection (Provider, GetIt, Riverpod)
- Create reusable custom widgets
- Use extensions for utility functions
- Keep widgets small and focused (SRP)

### UI/UX Best Practices
- Follow Material Design or Cupertino guidelines
- Use `MediaQuery` for responsive layouts
- Implement proper error handling and loading states
- Use `Hero` animations for transitions
- Provide haptic feedback where appropriate
- Support both light and dark themes
- Test on multiple screen sizes and orientations

### Security
- Never hardcode API keys (use environment variables)
- Use HTTPS for all network requests
- Implement certificate pinning for sensitive apps
- Validate all user input
- Use secure storage for sensitive data (flutter_secure_storage)
- Obfuscate code for production builds

## Anti-Patterns

### Avoid These Common Mistakes
- **setState in initState**: Use `addPostFrameCallback` or `Future.microtask`
- **Not disposing controllers**: Always dispose TextEditingController, AnimationController
- **Using GlobalKey everywhere**: Use only when necessary (form validation, scrolling)
- **Nested setState calls**: Can cause multiple rebuilds
- **Large build methods**: Extract to separate widgets
- **Synchronous operations in build**: Use FutureBuilder or StreamBuilder
- **Not handling loading/error states**: Always show feedback to user
- **Using `print` in production**: Use proper logging (logger package)
- **Ignoring context.mounted**: Check before async operations in widgets
- **Overusing packages**: Understand what each package does

### Bad State Management
```dart
// DON'T: Passing callbacks through many layers
class Parent extends StatefulWidget {
  @override
  State<Parent> createState() => _ParentState();
}

class _ParentState extends State<Parent> {
  int count = 0;

  @override
  Widget build(BuildContext context) {
    return Child(
      count: count,
      onIncrement: () => setState(() => count++),
    );
  }
}

// DO: Use Provider or other state management
class Parent extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => Counter(),
      child: Child(),
    );
  }
}
```

## Resources

### Documentation
- [Flutter Docs](https://docs.flutter.dev/)
- [Dart Language Tour](https://dart.dev/guides/language/language-tour)
- [Flutter Widget Catalog](https://docs.flutter.dev/ui/widgets)
- [Flutter Cookbook](https://docs.flutter.dev/cookbook)
- [API Reference](https://api.flutter.dev/)

### State Management
- [Provider Documentation](https://pub.dev/packages/provider)
- [Bloc Library](https://bloclibrary.dev/)
- [Riverpod](https://riverpod.dev/)
- [GetX](https://pub.dev/packages/get)

### Tools
- [Flutter DevTools](https://docs.flutter.dev/tools/devtools)
- [Very Good CLI](https://pub.dev/packages/very_good_cli)
- [FlutterFire CLI](https://firebase.flutter.dev/docs/cli)
- [Dart Code (VS Code)](https://marketplace.visualstudio.com/items?itemName=Dart-Code.dart-code)

### Testing & CI/CD
- [Testing Flutter Apps](https://docs.flutter.dev/testing)
- [Integration Testing](https://docs.flutter.dev/testing/integration-tests)
- [Codemagic CI/CD](https://codemagic.io/)
- [GitHub Actions for Flutter](https://github.com/subosito/flutter-action)

### Packages
- [pub.dev](https://pub.dev/) - Official package repository
- [flutter_launcher_icons](https://pub.dev/packages/flutter_launcher_icons)
- [flutter_native_splash](https://pub.dev/packages/flutter_native_splash)
- [dio](https://pub.dev/packages/dio) - HTTP client
- [freezed](https://pub.dev/packages/freezed) - Code generation for immutable classes
- [go_router](https://pub.dev/packages/go_router) - Declarative routing

### Community
- [Flutter Community](https://flutter.dev/community)
- [r/FlutterDev](https://reddit.com/r/FlutterDev)
- [Flutter Discord](https://discord.gg/flutter)
