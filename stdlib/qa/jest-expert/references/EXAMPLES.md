# Jest Expert — Implementation Examples

Reference material for the `jest-expert` skill. See [SKILL.md](../SKILL.md).

## Implementation Examples

### Basic Unit Tests

```javascript
// sum.js
function sum(a, b) {
  return a + b;
}

function subtract(a, b) {
  return a - b;
}

module.exports = { sum, subtract };

// sum.test.js
const { sum, subtract } = require('./sum');

describe('Math Operations', () => {
  describe('sum', () => {
    it('adds two positive numbers', () => {
      expect(sum(1, 2)).toBe(3);
    });

    it('adds positive and negative numbers', () => {
      expect(sum(10, -5)).toBe(5);
    });

    it('handles zero', () => {
      expect(sum(0, 5)).toBe(5);
      expect(sum(5, 0)).toBe(5);
    });

    it('adds decimal numbers', () => {
      expect(sum(0.1, 0.2)).toBeCloseTo(0.3);
    });
  });

  describe('subtract', () => {
    it('subtracts two numbers', () => {
      expect(subtract(5, 3)).toBe(2);
    });

    it('handles negative results', () => {
      expect(subtract(3, 5)).toBe(-2);
    });
  });
});
```

### Testing Async Code

```javascript
// api.js
const axios = require('axios');

async function fetchUser(userId) {
  const response = await axios.get(`/api/users/${userId}`);
  return response.data;
}

async function createUser(userData) {
  const response = await axios.post('/api/users', userData);
  return response.data;
}

module.exports = { fetchUser, createUser };

// api.test.js
const axios = require('axios');
const { fetchUser, createUser } = require('./api');

jest.mock('axios');

describe('API Functions', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchUser', () => {
    it('fetches user data successfully', async () => {
      const mockUser = { id: 1, name: 'John Doe', email: 'john@example.com' };
      axios.get.mockResolvedValue({ data: mockUser });

      const user = await fetchUser(1);

      expect(user).toEqual(mockUser);
      expect(axios.get).toHaveBeenCalledWith('/api/users/1');
      expect(axios.get).toHaveBeenCalledTimes(1);
    });

    it('handles API errors', async () => {
      const errorMessage = 'Network Error';
      axios.get.mockRejectedValue(new Error(errorMessage));

      await expect(fetchUser(1)).rejects.toThrow(errorMessage);
    });
  });

  describe('createUser', () => {
    it('creates user successfully', async () => {
      const newUser = { name: 'Jane Smith', email: 'jane@example.com' };
      const createdUser = { id: 2, ...newUser };

      axios.post.mockResolvedValue({ data: createdUser });

      const user = await createUser(newUser);

      expect(user).toEqual(createdUser);
      expect(axios.post).toHaveBeenCalledWith('/api/users', newUser);
    });
  });
});
```

### Mocking and Spies

```javascript
// userService.js
class UserService {
  constructor(database) {
    this.db = database;
  }

  async getUser(id) {
    return await this.db.findById(id);
  }

  async createUser(userData) {
    const user = await this.db.insert(userData);
    this.sendWelcomeEmail(user);
    return user;
  }

  sendWelcomeEmail(user) {
    console.log(`Sending welcome email to ${user.email}`);
  }
}

module.exports = UserService;

// userService.test.js
const UserService = require('./userService');

describe('UserService', () => {
  let userService;
  let mockDatabase;

  beforeEach(() => {
    mockDatabase = {
      findById: jest.fn(),
      insert: jest.fn(),
    };
    userService = new UserService(mockDatabase);
  });

  describe('getUser', () => {
    it('retrieves user from database', async () => {
      const mockUser = { id: 1, name: 'John' };
      mockDatabase.findById.mockResolvedValue(mockUser);

      const user = await userService.getUser(1);

      expect(user).toEqual(mockUser);
      expect(mockDatabase.findById).toHaveBeenCalledWith(1);
    });

    it('returns null when user not found', async () => {
      mockDatabase.findById.mockResolvedValue(null);

      const user = await userService.getUser(999);

      expect(user).toBeNull();
    });
  });

  describe('createUser', () => {
    it('creates user and sends welcome email', async () => {
      const userData = { name: 'Jane', email: 'jane@example.com' };
      const createdUser = { id: 2, ...userData };

      mockDatabase.insert.mockResolvedValue(createdUser);
      const emailSpy = jest.spyOn(userService, 'sendWelcomeEmail');

      const user = await userService.createUser(userData);

      expect(user).toEqual(createdUser);
      expect(mockDatabase.insert).toHaveBeenCalledWith(userData);
      expect(emailSpy).toHaveBeenCalledWith(createdUser);

      emailSpy.mockRestore();
    });
  });
});
```

### Snapshot Testing

```javascript
// Button.jsx
import React from 'react';

const Button = ({ children, variant = 'primary', onClick, disabled }) => {
  return (
    <button
      className={`btn btn-${variant}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default Button;

// Button.test.jsx
import React from 'react';
import renderer from 'react-test-renderer';
import Button from './Button';

describe('Button Component', () => {
  it('renders primary button correctly', () => {
    const tree = renderer.create(<Button>Click me</Button>).toJSON();

    expect(tree).toMatchSnapshot();
  });

  it('renders secondary button correctly', () => {
    const tree = renderer
      .create(<Button variant="secondary">Secondary</Button>)
      .toJSON();

    expect(tree).toMatchSnapshot();
  });

  it('renders disabled button correctly', () => {
    const tree = renderer.create(<Button disabled>Disabled</Button>).toJSON();

    expect(tree).toMatchSnapshot();
  });

  it('matches inline snapshot', () => {
    const tree = renderer.create(<Button>Test</Button>).toJSON();

    expect(tree).toMatchInlineSnapshot(`
            <button
              className="btn btn-primary"
              disabled={false}
              onClick={[Function]}
            >
              Test
            </button>
        `);
  });
});
```

### Testing React Components with React Testing Library

```javascript
// LoginForm.jsx
import React, { useState } from 'react';

const LoginForm = ({ onSubmit }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Email and password are required');
      return;
    }

    try {
      await onSubmit({ email, password });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        data-testid="email-input"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        data-testid="password-input"
      />
      <button type="submit">Login</button>
      {error && <div data-testid="error-message">{error}</div>}
    </form>
  );
};

export default LoginForm;

// LoginForm.test.jsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from './LoginForm';

describe('LoginForm', () => {
  it('renders login form', () => {
    render(<LoginForm onSubmit={jest.fn()} />);

    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('handles form submission with valid data', async () => {
    const handleSubmit = jest.fn().mockResolvedValue({});
    render(<LoginForm onSubmit={handleSubmit} />);

    const user = userEvent.setup();

    await user.type(screen.getByTestId('email-input'), 'user@example.com');
    await user.type(screen.getByTestId('password-input'), 'password123');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'password123',
      });
    });
  });

  it('shows error when fields are empty', async () => {
    render(<LoginForm onSubmit={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'Email and password are required'
      );
    });
  });

  it('displays API error message', async () => {
    const errorMessage = 'Invalid credentials';
    const handleSubmit = jest.fn().mockRejectedValue(new Error(errorMessage));

    render(<LoginForm onSubmit={handleSubmit} />);

    const user = userEvent.setup();

    await user.type(screen.getByTestId('email-input'), 'wrong@example.com');
    await user.type(screen.getByTestId('password-input'), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent(
        errorMessage
      );
    });
  });
});
```

### Timer Mocks

```javascript
// debounce.js
function debounce(func, delay) {
  let timeoutId;

  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

module.exports = debounce;

// debounce.test.js
const debounce = require('./debounce');

jest.useFakeTimers();

describe('debounce', () => {
  it('delays function execution', () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 1000);

    debouncedFn();
    expect(mockFn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(500);
    expect(mockFn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(500);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('cancels previous call when invoked again', () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 1000);

    debouncedFn();
    jest.advanceTimersByTime(500);

    debouncedFn();
    jest.advanceTimersByTime(500);
    expect(mockFn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(500);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('passes arguments correctly', () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 1000);

    debouncedFn('arg1', 'arg2');
    jest.runAllTimers();

    expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
  });
});
```

### Custom Matchers

```javascript
// custom-matchers.js
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;

    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },

  toBeValidEmail(received) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid email`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid email`,
        pass: false,
      };
    }
  },

  toHaveBeenCalledWithMatch(received, expected) {
    const pass = received.mock.calls.some((call) =>
      call.some((arg) =>
        typeof arg === 'object'
          ? Object.keys(expected).every((key) => arg[key] === expected[key])
          : arg === expected
      )
    );

    return {
      pass,
      message: () =>
        pass
          ? `expected mock not to have been called with ${JSON.stringify(expected)}`
          : `expected mock to have been called with ${JSON.stringify(expected)}`,
    };
  },
});

// custom-matchers.test.js
describe('Custom Matchers', () => {
  it('uses toBeWithinRange', () => {
    expect(100).toBeWithinRange(90, 110);
    expect(50).not.toBeWithinRange(100, 200);
  });

  it('uses toBeValidEmail', () => {
    expect('user@example.com').toBeValidEmail();
    expect('invalid-email').not.toBeValidEmail();
  });

  it('uses toHaveBeenCalledWithMatch', () => {
    const mockFn = jest.fn();

    mockFn({ name: 'John', age: 30, city: 'NYC' });
    mockFn({ name: 'Jane', age: 25 });

    expect(mockFn).toHaveBeenCalledWithMatch({ name: 'John', age: 30 });
    expect(mockFn).not.toHaveBeenCalledWithMatch({ name: 'Bob' });
  });
});
```

### Configuration (jest.config.js)

```javascript
module.exports = {
  // Test environment
  testEnvironment: 'jsdom',

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Coverage
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.js',
    '!src/**/*.stories.{js,jsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Module paths
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },

  // Transform
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': [
      'babel-jest',
      { configFile: './babel.config.js' },
    ],
  },

  // Test match patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{spec,test}.{js,jsx,ts,tsx}',
  ],

  // Ignore patterns
  testPathIgnorePatterns: ['/node_modules/', '/build/'],

  // Reporters
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: './test-results',
        outputName: 'junit.xml',
      },
    ],
  ],

  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],

  // Timers
  testTimeout: 10000,

  // Globals
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },
};
```
