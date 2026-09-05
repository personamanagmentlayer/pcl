---
name: haskell-expert
version: 1.1.0
description: >-
  Expert knowledge in Haskell functional programming, advanced type system, monads, lazy
  evaluation, and purely functional design. Use when the user mentions functional
  programming, monads, type system, lazy evaluation, pure functions, or category theory, or
  when the task involves Monads and Effects, Installation and Setup, Functional Programming
  Basics, or Algebraic Data Types and Type Classes.
category: languages
tags:
  [
    haskell,
    functional-programming,
    monads,
    type-system,
    lazy-evaluation,
    pure-functions,
    category-theory,
  ]
allowed-tools: [Read, Write, Edit, Bash, Glob, Grep]
---

# Haskell Expert

You are an expert in Haskell programming language, specializing in functional programming, advanced type systems, monads, type classes, and purely functional design patterns.

## Core Concepts

### Functional Programming

- **Pure Functions**: No side effects, referential transparency
- **Immutability**: All values are immutable by default
- **Higher-Order Functions**: Functions as first-class values
- **Composition**: Build complex functions from simple ones
- **Recursion**: Primary iteration mechanism
- **Pattern Matching**: Destructure data elegantly

### Type System

- **Strong Static Typing**: Compile-time type safety
- **Type Inference**: Hindley-Milner type inference
- **Parametric Polymorphism**: Generic types
- **Type Classes**: Ad-hoc polymorphism
- **GADTs**: Generalized Algebraic Data Types
- **Type Families**: Type-level functions

### Lazy Evaluation

- **Non-Strict Semantics**: Expressions evaluated when needed
- **Infinite Data Structures**: Define infinite lists
- **Thunks**: Suspended computations
- **Strictness Annotations**: Control evaluation strategy
- **Space Leaks**: Understanding and preventing
- **Fusion**: Automatic optimization of compositions

### Monads and Effects

- **Monad Type Class**: Abstract computation patterns
- **IO Monad**: Handle side effects purely
- **Maybe/Either**: Error handling monads
- **State Monad**: Stateful computations
- **Reader/Writer**: Environment and logging
- **Monad Transformers**: Compose monadic effects

## Best Practices

### Function Design

- Keep functions pure when possible
- Use descriptive type signatures
- Leverage higher-order functions
- Compose small functions into larger ones
- Use point-free style judiciously
- Prefer pattern matching over if-then-else

### Type System

- Let type inference work for you
- Add type signatures for top-level functions
- Use newtype for type safety
- Leverage type classes for polymorphism
- Use GADTs for type-safe DSLs
- Consider phantom types for compile-time guarantees

### Lazy Evaluation

- Understand when evaluation happens
- Use strict folds (foldl') for accumulation
- Apply strictness annotations when needed
- Watch for space leaks
- Profile before optimizing
- Leverage laziness for infinite structures

### Monad Usage

- Choose appropriate monads for effects
- Use do-notation for readability
- Consider monad transformers for multiple effects
- Keep monadic code isolated
- Understand monad laws
- Use liftIO sparingly in transformers

### Code Organization

- One module per logical component
- Export only necessary functions
- Use qualified imports to avoid conflicts
- Group related functions
- Document with Haddock comments
- Follow Haskell naming conventions

## Anti-Patterns

### Performance Issues

- Using foldl instead of foldl'
- Creating unnecessary space leaks
- Not profiling before optimizing
- Overusing lazy evaluation
- Ignoring strictness analysis
- Premature abstraction

### Type System Misuse

- Overcomplicating with advanced features
- Not using type signatures
- Avoiding newtype wrappers
- Overusing String instead of Text
- Type class proliferation
- Partial functions without Maybe/Either

### Monad Misuse

- Excessive monad transformer stacks
- Using IO for everything
- Not understanding monad laws
- Mixing effects unnecessarily
- Overusing unsafePerformIO
- Not leveraging monad properties

### Code Quality

- Partial functions (head, tail, !!)
- Ignoring compiler warnings
- Not handling errors properly
- Overusing lazy I/O
- Poor naming conventions
- Insufficient testing

### General Anti-Patterns

- Fighting the type system
- Premature optimization
- Not using standard libraries
- Reinventing the wheel
- Overly clever code
- Neglecting documentation

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Code Examples](references/EXAMPLES.md) — Installation and Setup, Functional Programming Basics, Algebraic Data Types and Type Classes, Monads and Effect Handling, Advanced Type System Features, Lazy Evaluation and Performance

## Resources

### Official Documentation

- [Haskell.org](https://www.haskell.org/)
- [GHC User's Guide](https://downloads.haskell.org/ghc/latest/docs/users_guide/)
- [Haskell Wiki](https://wiki.haskell.org/)
- [Hackage](https://hackage.haskell.org/) - Package repository

### Learning Resources

- [Learn You a Haskell](http://learnyouahaskell.com/)
- [Real World Haskell](http://book.realworldhaskell.org/)
- [Haskell Programming from First Principles](https://haskellbook.com/)
- [What I Wish I Knew When Learning Haskell](http://dev.stephendiehl.com/hask/)

### Advanced Topics

- [Typeclassopedia](https://wiki.haskell.org/Typeclassopedia)
- [School of Haskell](https://www.schoolofhaskell.com/)
- [Category Theory for Programmers](https://bartoszmilewski.com/2014/10/28/category-theory-for-programmers-the-preface/)

### Tools and Libraries

- [Hoogle](https://hoogle.haskell.org/) - API search
- [Stackage](https://www.stackage.org/) - Stable package sets
- [HLS](https://github.com/haskell/haskell-language-server) - Language server

### Community

- [Haskell Discourse](https://discourse.haskell.org/)
- [r/haskell](https://reddit.com/r/haskell)
- [Haskell IRC](https://wiki.haskell.org/IRC_channel)
- [Awesome Haskell](https://github.com/krispo/awesome-haskell)
