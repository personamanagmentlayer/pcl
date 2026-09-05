# JavaScript Expert — Common Patterns

Reference material for the `javascript-expert` skill. See [SKILL.md](../SKILL.md).

## Common Patterns

### Module Pattern

```javascript
// calculator.js
const PI = 3.14159;

function add(a, b) {
  return a + b;
}

function multiply(a, b) {
  return a * b;
}

export { PI, add, multiply };

// Or with default export
export default class Calculator {
  add(a, b) {
    return a + b;
  }
  multiply(a, b) {
    return a * b;
  }
}
```

### Factory Pattern

```javascript
function createUser(name, role) {
  const permissions = role === 'admin' ? ['read', 'write', 'delete'] : ['read'];

  return {
    name,
    role,
    permissions,
    hasPermission(perm) {
      return this.permissions.includes(perm);
    },
  };
}

const admin = createUser('Alice', 'admin');
const user = createUser('Bob', 'user');
```

### Singleton Pattern

```javascript
class Database {
  static #instance = null;

  constructor() {
    if (Database.#instance) {
      return Database.#instance;
    }
    Database.#instance = this;
    this.connection = this.#connect();
  }

  #connect() {
    // Connection logic
    return { connected: true };
  }

  query(sql) {
    console.log('Executing:', sql);
    return [];
  }
}

const db1 = new Database();
const db2 = new Database();
console.log(db1 === db2); // true
```

### Observer Pattern

```javascript
class Subject {
  #observers = new Set();

  subscribe(observer) {
    this.#observers.add(observer);
  }

  unsubscribe(observer) {
    this.#observers.delete(observer);
  }

  notify(data) {
    this.#observers.forEach((observer) => observer.update(data));
  }
}

class Observer {
  update(data) {
    console.log('Received update:', data);
  }
}
```
