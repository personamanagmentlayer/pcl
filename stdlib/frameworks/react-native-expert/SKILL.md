---
name: react-native-expert
description: >-
  Expert in React Native, cross-platform mobile development, native modules, and
  performance optimization. Use when the user mentions mobile, JavaScript, TypeScript,
  cross platform, iOS, or Android, or when the task involves React Native Architecture,
  Component Types, Hooks Essentials, or Navigation.
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
version: 1.1.0
tags:
  [mobile, react-native, javascript, typescript, cross-platform, ios, android]
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

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Code Examples](references/EXAMPLES.md) — Basic App Structure, Component with Hooks, React Navigation Setup, Context API for State Management, Native Module (Objective-C/Java), Performance Optimization

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
