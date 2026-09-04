# PHP Expert — Modern PHP 8+ Syntax

Reference material for the `php-expert` skill. See [SKILL.md](../SKILL.md).

## Modern PHP 8+ Syntax

### Constructor Property Promotion

```php
<?php

// Before PHP 8
class User {
    private string $name;
    private string $email;
    private int $age;

    public function __construct(string $name, string $email, int $age) {
        $this->name = $name;
        $this->email = $email;
        $this->age = $age;
    }
}

// PHP 8+ (constructor property promotion)
class User {
    public function __construct(
        private string $name,
        private string $email,
        private int $age,
    ) {}

    public function getName(): string {
        return $this->name;
    }
}

$user = new User('Alice', 'alice@example.com', 30);
```

### Named Arguments

```php
<?php

function createUser(
    string $name,
    string $email,
    int $age = 18,
    bool $admin = false,
): User {
    return new User($name, $email, $age, $admin);
}

// Named arguments (PHP 8+)
$user = createUser(
    name: 'Alice',
    email: 'alice@example.com',
    age: 30,
    admin: true,
);

// Skip optional parameters
$user = createUser(
    name: 'Bob',
    email: 'bob@example.com',
);
```

### Union Types and Mixed

```php
<?php

// Union types (PHP 8+)
function processValue(int|float $number): int|float {
    return $number * 2;
}

function findUser(int|string $identifier): ?User {
    if (is_int($identifier)) {
        return User::find($identifier);
    }
    return User::where('email', $identifier)->first();
}

// Mixed type (accepts any type)
function debugValue(mixed $value): void {
    var_dump($value);
}
```

### Match Expression

```php
<?php

// Old switch
switch ($status) {
    case 'pending':
        $message = 'Order is pending';
        break;
    case 'processing':
        $message = 'Order is being processed';
        break;
    case 'completed':
        $message = 'Order completed';
        break;
    default:
        $message = 'Unknown status';
}

// Match expression (PHP 8+)
$message = match ($status) {
    'pending' => 'Order is pending',
    'processing' => 'Order is being processed',
    'completed' => 'Order completed',
    default => 'Unknown status',
};

// Multiple conditions
$result = match ($value) {
    0, 1, 2 => 'Small',
    3, 4, 5 => 'Medium',
    default => 'Large',
};

// With expressions
$discount = match (true) {
    $customer->isPremium() && $order->total() > 1000 => 0.20,
    $customer->isPremium() => 0.15,
    $order->total() > 500 => 0.10,
    default => 0,
};
```

### Nullsafe Operator

```php
<?php

// Before PHP 8
$country = null;
if ($user !== null) {
    $address = $user->getAddress();
    if ($address !== null) {
        $country = $address->getCountry();
    }
}

// PHP 8+ nullsafe operator
$country = $user?->getAddress()?->getCountry();

// With default
$country = $user?->getAddress()?->getCountry() ?? 'Unknown';
```

### Attributes (Annotations)

```php
<?php

// Define attribute
#[Attribute]
class Route {
    public function __construct(
        public string $path,
        public string $method = 'GET',
    ) {}
}

// Use attribute
class UserController {
    #[Route('/users', method: 'GET')]
    public function index(): array {
        return User::all();
    }

    #[Route('/users/{id}', method: 'GET')]
    public function show(int $id): User {
        return User::findOrFail($id);
    }

    #[Route('/users', method: 'POST')]
    public function store(Request $request): User {
        return User::create($request->all());
    }
}

// Read attributes
$reflection = new ReflectionClass(UserController::class);
foreach ($reflection->getMethods() as $method) {
    $attributes = $method->getAttributes(Route::class);
    foreach ($attributes as $attribute) {
        $route = $attribute->newInstance();
        echo "{$route->method} {$route->path}\n";
    }
}
```

### Enums (PHP 8.1+)

```php
<?php

// Basic enum
enum Status {
    case Pending;
    case Processing;
    case Completed;
    case Cancelled;
}

// Usage
$status = Status::Pending;

function updateOrder(Order $order, Status $status): void {
    $order->status = $status;
    $order->save();
}

// Backed enums
enum OrderStatus: string {
    case Pending = 'pending';
    case Processing = 'processing';
    case Completed = 'completed';
    case Cancelled = 'cancelled';

    public function label(): string {
        return match($this) {
            self::Pending => 'Pending',
            self::Processing => 'Being Processed',
            self::Completed => 'Completed',
            self::Cancelled => 'Cancelled',
        };
    }

    public function color(): string {
        return match($this) {
            self::Pending => 'yellow',
            self::Processing => 'blue',
            self::Completed => 'green',
            self::Cancelled => 'red',
        };
    }
}

$status = OrderStatus::from('pending');
echo $status->label(); // 'Pending'
echo $status->value;   // 'pending'
```

### Readonly Properties and Classes

```php
<?php

// Readonly property (PHP 8.1+)
class User {
    public function __construct(
        public readonly string $id,
        public readonly string $email,
        public string $name,
    ) {}
}

$user = new User('123', 'user@example.com', 'Alice');
$user->name = 'Bob'; // OK
// $user->email = 'new@example.com'; // Error: readonly property

// Readonly class (PHP 8.2+)
readonly class Point {
    public function __construct(
        public int $x,
        public int $y,
    ) {}
}
```
