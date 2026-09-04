# Haskell Expert — Code Examples

Reference material for the `haskell-expert` skill. See [SKILL.md](../SKILL.md).

## Code Examples

### Installation and Setup

```bash
# Install GHCup (Haskell toolchain installer)
curl --proto '=https' --tlsv1.2 -sSf https://get-ghcup.haskell.org | sh

# Install GHC (compiler), cabal (build tool), HLS (language server)
ghcup install ghc
ghcup install cabal
ghcup install hls

# Verify installation
ghc --version
cabal --version

# Create new project
cabal init --simple --minimal
# Or with more options
cabal init

# Build project
cabal build

# Run project
cabal run

# Start REPL
ghci
# or
cabal repl

# Install dependencies
cabal install package-name

# Alternative: Stack build tool
# curl -sSL https://get.haskellstack.org/ | sh
# stack new my-project
# stack build
# stack run
```

### Functional Programming Basics

```haskell
-- Basic functions
square :: Int -> Int
square x = x * x

-- Higher-order functions
applyTwice :: (a -> a) -> a -> a
applyTwice f x = f (f x)

-- Lambda expressions
increment :: Int -> Int
increment = \x -> x + 1

-- Currying and partial application
add :: Int -> Int -> Int
add x y = x + y

addFive :: Int -> Int
addFive = add 5

-- Function composition
f :: Int -> Int
g :: Int -> Int
h :: Int -> Int

f = (*2)
g = (+3)
h = g . f  -- h x = g (f x)

-- Pattern matching
factorial :: Integer -> Integer
factorial 0 = 1
factorial n = n * factorial (n - 1)

-- Guards
absoluteValue :: Int -> Int
absoluteValue x
  | x < 0     = -x
  | otherwise = x

-- List operations
sumList :: [Int] -> Int
sumList []     = 0
sumList (x:xs) = x + sumList xs

-- Map, filter, fold
processNumbers :: [Int] -> Int
processNumbers xs =
  foldr (+) 0 $ filter even $ map (*2) xs

-- List comprehensions
squares :: [Int]
squares = [x * x | x <- [1..10]]

pythagorean :: [(Int, Int, Int)]
pythagorean = [(a, b, c) |
               c <- [1..100],
               b <- [1..c],
               a <- [1..b],
               a^2 + b^2 == c^2]

-- Example usage
main :: IO ()
main = do
  print $ square 5
  print $ applyTwice (*2) 3
  print $ addFive 10
  print $ h 5
  print $ factorial 5
  print $ processNumbers [1..10]
  print $ take 5 squares
```

### Algebraic Data Types and Type Classes

```haskell
-- Sum types (enums)
data Color = Red | Green | Blue deriving (Show, Eq)

-- Product types (structs)
data Point = Point Double Double deriving (Show)

-- Parametric types
data Maybe' a = Nothing' | Just' a deriving (Show)

-- Recursive types
data List a = Empty | Cons a (List a) deriving (Show)

data Tree a = Leaf a | Node (Tree a) a (Tree a) deriving (Show)

-- Record syntax
data Person = Person {
  name :: String,
  age :: Int,
  email :: String
} deriving (Show)

-- Type classes
class Describable a where
  describe :: a -> String

instance Describable Person where
  describe p = name p ++ " (" ++ show (age p) ++ ")"

instance Describable Color where
  describe Red   = "Red color"
  describe Green = "Green color"
  describe Blue  = "Blue color"

-- Functor instance
instance Functor Tree where
  fmap f (Leaf x)     = Leaf (f x)
  fmap f (Node l x r) = Node (fmap f l) (f x) (fmap f r)

-- Custom type class with laws
class Measurable a where
  measure :: a -> Double

instance Measurable Point where
  measure (Point x y) = sqrt (x * x + y * y)

instance Measurable [a] where
  measure xs = fromIntegral (length xs)

-- Functor, Applicative, Monad for custom type
data Box a = Box a deriving (Show)

instance Functor Box where
  fmap f (Box x) = Box (f x)

instance Applicative Box where
  pure = Box
  (Box f) <*> (Box x) = Box (f x)

instance Monad Box where
  return = Box
  (Box x) >>= f = f x

-- Example usage
main :: IO ()
main = do
  let person = Person "Alice" 30 "alice@example.com"
  putStrLn $ describe person
  putStrLn $ describe Red

  let tree = Node (Leaf 1) 2 (Leaf 3)
  print $ fmap (*2) tree

  let point = Point 3 4
  print $ measure point
```

### Monads and Effect Handling

```haskell
import Control.Monad (when, unless, forM_)
import Data.Maybe (fromMaybe)

-- Maybe monad for safe computation
safeDivide :: Double -> Double -> Maybe Double
safeDivide _ 0 = Nothing
safeDivide x y = Just (x / y)

calculateRatio :: Double -> Double -> Double -> Maybe Double
calculateRatio a b c = do
  x <- safeDivide a b
  y <- safeDivide x c
  return y

-- Either monad for error handling
data Error = DivisionByZero | NegativeNumber String deriving (Show)

safeDivideE :: Double -> Double -> Either Error Double
safeDivideE _ 0 = Left DivisionByZero
safeDivideE x y = Right (x / y)

safeSqrt :: Double -> Either Error Double
safeSqrt x
  | x < 0     = Left (NegativeNumber "Cannot take square root of negative")
  | otherwise = Right (sqrt x)

calculateDistance :: Double -> Double -> Either Error Double
calculateDistance a b = do
  ratio <- safeDivideE a b
  safeSqrt ratio

-- State monad
import Control.Monad.State

type Stack = [Int]

push :: Int -> State Stack ()
push x = modify (x:)

pop :: State Stack (Maybe Int)
pop = do
  stack <- get
  case stack of
    []     -> return Nothing
    (x:xs) -> do
      put xs
      return (Just x)

stackOperations :: State Stack Int
stackOperations = do
  push 10
  push 20
  push 30
  x <- pop
  y <- pop
  return $ fromMaybe 0 x + fromMaybe 0 y

-- Reader monad for configuration
import Control.Monad.Reader

data Config = Config {
  host :: String,
  port :: Int,
  debug :: Bool
}

type App = Reader Config

getConnectionString :: App String
getConnectionString = do
  h <- asks host
  p <- asks port
  return $ h ++ ":" ++ show p

logMessage :: String -> App ()
logMessage msg = do
  isDebug <- asks debug
  when isDebug $ return ()  -- Would log in real app

runApp :: App a -> Config -> a
runApp = runReader

-- Writer monad for logging
import Control.Monad.Writer

type Logged = Writer [String]

factorial' :: Int -> Logged Int
factorial' 0 = do
  tell ["Base case: 0! = 1"]
  return 1
factorial' n = do
  tell ["Computing " ++ show n ++ "!"]
  result <- factorial' (n - 1)
  let answer = n * result
  tell ["Result: " ++ show n ++ "! = " ++ show answer]
  return answer

-- IO monad
readAndProcess :: IO ()
readAndProcess = do
  putStrLn "Enter your name:"
  name <- getLine
  putStrLn $ "Hello, " ++ name ++ "!"

  putStrLn "Enter numbers (one per line, empty to stop):"
  numbers <- readNumbers
  putStrLn $ "Sum: " ++ show (sum numbers)

readNumbers :: IO [Int]
readNumbers = do
  line <- getLine
  if null line
    then return []
    else do
      rest <- readNumbers
      return (read line : rest)

-- Example usage
main :: IO ()
main = do
  -- Maybe monad
  print $ calculateRatio 10 2 5

  -- Either monad
  case calculateDistance 16 4 of
    Left err  -> print err
    Right val -> print val

  -- State monad
  let (result, finalStack) = runState stackOperations []
  print result
  print finalStack

  -- Reader monad
  let config = Config "localhost" 8080 True
  print $ runApp getConnectionString config

  -- Writer monad
  let (result', logs) = runWriter (factorial' 5)
  print result'
  mapM_ putStrLn logs
```

### Advanced Type System Features

```haskell
{-# LANGUAGE GADTs #-}
{-# LANGUAGE TypeFamilies #-}
{-# LANGUAGE DataKinds #-}
{-# LANGUAGE KindSignatures #-}

-- GADTs (Generalized Algebraic Data Types)
data Expr a where
  IntLit  :: Int -> Expr Int
  BoolLit :: Bool -> Expr Bool
  Add     :: Expr Int -> Expr Int -> Expr Int
  Equals  :: Expr Int -> Expr Int -> Expr Bool
  If      :: Expr Bool -> Expr a -> Expr a -> Expr a

eval :: Expr a -> a
eval (IntLit n)      = n
eval (BoolLit b)     = b
eval (Add e1 e2)     = eval e1 + eval e2
eval (Equals e1 e2)  = eval e1 == eval e2
eval (If cond t e)   = if eval cond then eval t else eval e

-- Type families
type family Element c where
  Element [a]    = a
  Element (a, b) = a

headOf :: [a] -> Element [a]
headOf []    = error "Empty list"
headOf (x:_) = x

-- Phantom types
data USD
data EUR
data GBP

newtype Money currency = Money Double deriving (Show)

dollars :: Double -> Money USD
dollars = Money

euros :: Double -> Money EUR
euros = Money

-- Type-safe operations
addMoney :: Money c -> Money c -> Money c
addMoney (Money x) (Money y) = Money (x + y)

-- This won't compile: type mismatch
-- mixedSum = addMoney (dollars 10) (euros 20)

-- Existential types
{-# LANGUAGE ExistentialQuantification #-}

data ShowBox = forall a. Show a => ShowBox a

instance Show ShowBox where
  show (ShowBox a) = show a

boxes :: [ShowBox]
boxes = [ShowBox 42, ShowBox "hello", ShowBox True]

-- Rank-N types
{-# LANGUAGE RankNTypes #-}

applyToAll :: (forall a. a -> a) -> (Int, Bool, String)
applyToAll f = (f 1, f True, f "test")

-- Type-level programming
data Nat = Zero | Succ Nat

data Vec (n :: Nat) a where
  VNil  :: Vec 'Zero a
  VCons :: a -> Vec n a -> Vec ('Succ n) a

vhead :: Vec ('Succ n) a -> a
vhead (VCons x _) = x

-- Example usage
main :: IO ()
main = do
  -- GADT evaluation
  let expr = Add (IntLit 10) (IntLit 20)
  print $ eval expr

  let boolExpr = Equals (IntLit 5) (Add (IntLit 2) (IntLit 3))
  print $ eval boolExpr

  -- Type-safe money
  let total = addMoney (dollars 10) (dollars 20)
  print total

  -- Existential types
  mapM_ print boxes
```

### Lazy Evaluation and Performance

```haskell
import Debug.Trace

-- Infinite lists
naturals :: [Integer]
naturals = [1..]

fibonacci :: [Integer]
fibonacci = 0 : 1 : zipWith (+) fibonacci (tail fibonacci)

primes :: [Integer]
primes = sieve [2..]
  where
    sieve (p:xs) = p : sieve [x | x <- xs, x `mod` p /= 0]

-- Lazy evaluation demonstration
demonstrateLaziness :: Int
demonstrateLaziness =
  let x = trace "Computing x" (10 :: Int)
      y = trace "Computing y" (20 :: Int)
  in x  -- Only x is evaluated

-- Strictness control
import Control.DeepSeq

-- Strict data type
data StrictPair a b = StrictPair !a !b deriving (Show)

-- Force evaluation
forceEval :: NFData a => a -> IO a
forceEval x = do
  return $!! x  -- Fully evaluate

-- Bang patterns
{-# LANGUAGE BangPatterns #-}

strictSum :: [Int] -> Int
strictSum = go 0
  where
    go !acc []     = acc
    go !acc (x:xs) = go (acc + x) xs

-- Lazy vs strict folds
lazyFold :: [Int] -> Int
lazyFold = foldr (+) 0

strictFold :: [Int] -> Int
strictFold = foldl' (+) 0

-- Space leak example (BAD)
leakySum :: [Int] -> Int
leakySum = foldl (+) 0  -- Builds large thunk

-- Fixed version (GOOD)
efficientSum :: [Int] -> Int
efficientSum = foldl' (+) 0  -- Strict left fold

-- Memoization with lazy evaluation
memoize :: (Int -> a) -> (Int -> a)
memoize f = (map f [0..] !!)

slowFib :: Int -> Integer
slowFib 0 = 0
slowFib 1 = 1
slowFib n = slowFib (n-1) + slowFib (n-2)

fastFib :: Int -> Integer
fastFib = memoize slowFib

-- Stream processing
import Data.List (unfoldr)

generateStream :: Int -> [Int]
generateStream seed = unfoldr step seed
  where
    step n = Just (n, n + 1)

processStream :: [Int] -> [Int]
processStream = map (*2) . filter even . take 1000000

-- Example usage
main :: IO ()
main = do
  -- Infinite lists (only compute what's needed)
  print $ take 10 naturals
  print $ take 10 fibonacci
  print $ take 10 primes

  -- Lazy evaluation
  print demonstrateLaziness

  -- Strict evaluation
  let numbers = [1..1000000]
  print $ strictSum numbers

  -- Memoization
  print $ fastFib 30
```
