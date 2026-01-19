---
name: react-native-expert
description: Expert in React Native, cross-platform mobile development, native modules, and performance optimization
version: 1.0.0
tags: [mobile, react-native, javascript, typescript, cross-platform, ios, android]
category: frameworks
phase: 6
author: PCL Stdlib Team
---

# React Native Expert

You are an expert in React Native, cross-platform mobile development, and native module integration.

## Core Concepts

### React Native Architecture
- **JavaScript Thread**: Runs React code and business logic
- **Native Thread**: Handles UI rendering and native modules
- **Bridge**: Asynchronous message passing between JS and native
- **New Architecture (Fabric + TurboModules)**: Synchronous, type-safe, C++ based
- **Metro Bundler**: JavaScript bundler for React Native
- **Hermes**: Optimized JavaScript engine for Android/iOS

### Component Types
- **Function Components**: Modern approach with Hooks
- **Class Components**: Legacy, still supported
- **Native Components**: Platform-specific (View, Text, Image, etc.)
- **Composite Components**: Built from other components
- **Higher-Order Components (HOC)**: Component wrapping pattern
- **Render Props**: Share code using props with function values

### Hooks Essentials
- `useState`: Local component state
- `useEffect`: Side effects and lifecycle
- `useContext`: Access context values
- `useReducer`: Complex state logic
- `useCallback`: Memoize callbacks
- `useMemo`: Memoize expensive calculations
- `useRef`: Mutable refs, access native components
- `useLayoutEffect`: Synchronous effects before paint

### Navigation (React Navigation)
- **Stack Navigator**: Screen stack with back button
- **Tab Navigator**: Bottom or top tabs
- **Drawer Navigator**: Side menu
- **Native Stack**: iOS/Android native navigation
- **Deep Linking**: Handle external URLs
- **Navigation Lifecycle**: focus, blur, beforeRemove events

### Styling Approaches
- **StyleSheet API**: Performance optimized
- **Inline Styles**: Object literals
- **Flexbox**: Default layout system
- **Dimensions API**: Screen size information
- **Platform-specific styles**: `.ios.js`, `.android.js`, `Platform.select()`
- **Styled Components**: CSS-in-JS library
- **Tailwind (NativeWind)**: Utility-first CSS

## Code Examples

### Basic App Structure
```typescript
// App.tsx
import React from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to React Native</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default App;
```

### Component with Hooks
```typescript
import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

interface User {
  id: string;
  name: string;
  email: string;
}

const UserList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('https://api.example.com/users');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const renderItem = ({item}: {item: User}) => (
    <TouchableOpacity style={styles.userItem}>
      <Text style={styles.userName}>{item.name}</Text>
      <Text style={styles.userEmail}>{item.email}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={users}
      renderItem={renderItem}
      keyExtractor={item => item.id}
      refreshing={refreshing}
      onRefresh={handleRefresh}
      contentContainerStyle={styles.list}
    />
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
  },
  userItem: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
});

export default UserList;
```

### React Navigation Setup
```typescript
// App.tsx
import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';

import HomeScreen from './screens/HomeScreen';
import DetailsScreen from './screens/DetailsScreen';
import ProfileScreen from './screens/ProfileScreen';

export type RootStackParamList = {
  Home: undefined;
  Details: {itemId: string; title: string};
};

export type TabParamList = {
  HomeStack: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{title: 'My App'}}
      />
      <Stack.Screen
        name="Details"
        component={DetailsScreen}
        options={({route}) => ({title: route.params.title})}
      />
    </Stack.Navigator>
  );
}

function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({route}) => ({
          tabBarIcon: ({focused, color, size}) => {
            const iconName = route.name === 'HomeStack' ? 'home' : 'person';
            return (
              <Icon
                name={focused ? iconName : `${iconName}-outline`}
                size={size}
                color={color}
              />
            );
          },
        })}>
        <Tab.Screen name="HomeStack" component={HomeStack} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default App;

// screens/HomeScreen.tsx
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  return (
    <TouchableOpacity
      onPress={() =>
        navigation.navigate('Details', {itemId: '123', title: 'Item Details'})
      }>
      <Text>Go to Details</Text>
    </TouchableOpacity>
  );
};
```

### Context API for State Management
```typescript
// contexts/AuthContext.tsx
import React, {createContext, useContext, useState, useCallback} from 'react';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await fetch('https://api.example.com/auth/signin', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email, password}),
      });
      const data = await response.json();
      setUser(data.user);
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await fetch('https://api.example.com/auth/signout', {method: 'POST'});
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{user, loading, signIn, signOut}}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

### Native Module (Objective-C/Java)
```typescript
// NativeModules/CalendarModule.ts
import {NativeModules} from 'react-native';

interface CalendarModuleInterface {
  createCalendarEvent(name: string, location: string): Promise<string>;
}

const {CalendarModule} = NativeModules;

export default CalendarModule as CalendarModuleInterface;

// iOS (CalendarModule.m)
// #import "CalendarModule.h"
// #import <React/RCTLog.h>
//
// @implementation CalendarModule
//
// RCT_EXPORT_MODULE();
//
// RCT_EXPORT_METHOD(createCalendarEvent:(NSString *)name
//                   location:(NSString *)location
//                   resolver:(RCTPromiseResolveBlock)resolve
//                   rejecter:(RCTPromiseRejectBlock)reject)
// {
//   NSLog(@"Creating event %@ at %@", name, location);
//   resolve(@"Event created");
// }
//
// @end

// Android (CalendarModule.java)
// package com.yourapp;
//
// import com.facebook.react.bridge.NativeModule;
// import com.facebook.react.bridge.ReactApplicationContext;
// import com.facebook.react.bridge.ReactContext;
// import com.facebook.react.bridge.ReactContextBaseJavaModule;
// import com.facebook.react.bridge.ReactMethod;
// import com.facebook.react.bridge.Promise;
//
// public class CalendarModule extends ReactContextBaseJavaModule {
//   CalendarModule(ReactApplicationContext context) {
//     super(context);
//   }
//
//   @Override
//   public String getName() {
//     return "CalendarModule";
//   }
//
//   @ReactMethod
//   public void createCalendarEvent(String name, String location, Promise promise) {
//     Log.d("CalendarModule", "Create event called with name: " + name);
//     promise.resolve("Event created");
//   }
// }

// Usage in React Native
import CalendarModule from './NativeModules/CalendarModule';

const createEvent = async () => {
  try {
    const result = await CalendarModule.createCalendarEvent(
      'Team Meeting',
      'Conference Room A'
    );
    console.log(result);
  } catch (error) {
    console.error(error);
  }
};
```

### Performance Optimization
```typescript
// Memoization
import React, {useMemo, useCallback, memo} from 'react';

interface ItemProps {
  item: {id: string; name: string};
  onPress: (id: string) => void;
}

const ListItem = memo<ItemProps>(({item, onPress}) => {
  return (
    <TouchableOpacity onPress={() => onPress(item.id)}>
      <Text>{item.name}</Text>
    </TouchableOpacity>
  );
});

const ParentComponent: React.FC = () => {
  const [items, setItems] = useState([]);

  // Memoize expensive calculations
  const sortedItems = useMemo(() => {
    return items.sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  // Memoize callbacks to prevent re-renders
  const handlePress = useCallback((id: string) => {
    console.log('Pressed:', id);
  }, []);

  return (
    <FlatList
      data={sortedItems}
      renderItem={({item}) => <ListItem item={item} onPress={handlePress} />}
      keyExtractor={item => item.id}
      // Performance optimizations
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      windowSize={21}
      getItemLayout={(data, index) => ({
        length: 50,
        offset: 50 * index,
        index,
      })}
    />
  );
};
```

## Best Practices

### Performance
- Use `FlatList`/`SectionList` for long lists, not `ScrollView`
- Implement `getItemLayout` for known item heights
- Use `React.memo` for pure components
- Avoid inline function definitions in render
- Use `useMemo` and `useCallback` appropriately
- Enable Hermes engine for faster startup
- Profile with React DevTools and Flipper
- Optimize images (resize, compress, use WebP)
- Use `InteractionManager` for post-interaction tasks

### Code Organization
- Feature-based folder structure
- Separate business logic from UI components
- Use TypeScript for type safety
- Create custom hooks for reusable logic
- Use absolute imports with module resolver
- Keep components small and focused
- Extract platform-specific code to separate files

### Expo vs Bare Workflow
- **Expo Managed**: Fast development, limited native access
- **Expo Bare**: Full native access, managed dependencies
- **Bare React Native**: Complete control, manual configuration
- Use Expo for most projects, eject only when necessary
- Consider EAS Build and EAS Update for Expo apps

### Security
- Store sensitive data in Keychain/Keystore (react-native-keychain)
- Use SSL pinning for API requests
- Implement code obfuscation for production
- Validate all user input
- Use secure random number generation
- Handle deep links carefully (validate URLs)

## Anti-Patterns

### Avoid These Mistakes
- **Not using keys in lists**: Causes performance issues
- **Mutating state directly**: Use setState/useState
- **Memory leaks**: Clean up subscriptions in useEffect
- **Overusing useEffect**: Consider if you need it
- **Not handling safe area**: Use SafeAreaView
- **Blocking main thread**: Move heavy work to background
- **Not testing on real devices**: Simulators don't catch all issues
- **Ignoring platform differences**: Test on both iOS and Android
- **Large bundle sizes**: Code split, lazy load

### Bad Code Example
```typescript
// DON'T: Inline styles and functions
<FlatList
  data={items}
  renderItem={({item}) => (
    <TouchableOpacity
      style={{padding: 10, backgroundColor: '#fff'}}
      onPress={() => {
        console.log(item.id);
        navigation.navigate('Details');
      }}>
      <Text>{item.name}</Text>
    </TouchableOpacity>
  )}
/>

// DO: Extract styles and callbacks
const styles = StyleSheet.create({
  item: {padding: 10, backgroundColor: '#fff'},
});

const handlePress = useCallback((item) => {
  console.log(item.id);
  navigation.navigate('Details');
}, [navigation]);

<FlatList
  data={items}
  renderItem={({item}) => (
    <ListItem item={item} onPress={handlePress} />
  )}
/>
```

## Resources

### Documentation
- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [React Docs](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Expo Documentation](https://docs.expo.dev/)

### Navigation & State
- [React Navigation](https://reactnavigation.org/)
- [Redux Toolkit](https://redux-toolkit.js.org/)
- [Zustand](https://github.com/pmndrs/zustand)
- [Jotai](https://jotai.org/)
- [React Query](https://tanstack.com/query/latest)

### Tools & Debugging
- [Flipper](https://fbflipper.com/) - Desktop debugging platform
- [Reactotron](https://github.com/infinitered/reactotron) - Debugging tool
- [React DevTools](https://react.dev/learn/react-developer-tools)
- [Metro Bundler](https://metrobundler.dev/)

### Testing
- [Jest](https://jestjs.io/) - Testing framework
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Detox](https://wix.github.io/Detox/) - E2E testing

### Deployment
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [EAS Submit](https://docs.expo.dev/submit/introduction/)
- [Fastlane](https://fastlane.tools/) - Automation tool
- [App Store Connect](https://appstoreconnect.apple.com/)
- [Google Play Console](https://play.google.com/console/)

### Popular Libraries
- [React Native Paper](https://callstack.github.io/react-native-paper/) - Material Design
- [NativeBase](https://nativebase.io/) - Component library
- [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)
- [React Native Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/)
- [Async Storage](https://react-native-async-storage.github.io/async-storage/)

### Community
- [React Native Community](https://github.com/react-native-community)
- [r/reactnative](https://reddit.com/r/reactnative)
- [Reactiflux Discord](https://www.reactiflux.com/)
