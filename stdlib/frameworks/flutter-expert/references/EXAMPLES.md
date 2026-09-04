# Flutter Expert — Code Examples

Reference material for the `flutter-expert` skill. See [SKILL.md](../SKILL.md).

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
