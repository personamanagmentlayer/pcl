# Clojure Expert — Code Examples

Reference material for the `clojure-expert` skill. See [SKILL.md](../SKILL.md).

## Code Examples

### Installation and Setup

```bash
# Install Clojure CLI tools
# macOS/Linux
curl -O https://download.clojure.org/install/linux-install-1.11.1.1435.sh
chmod +x linux-install-1.11.1.1435.sh
sudo ./linux-install-1.11.1.1435.sh

# Windows - use Scoop
scoop install clojure

# Or use Leiningen
# macOS/Linux
curl https://raw.githubusercontent.com/technomancy/leiningen/stable/bin/lein > lein
chmod +x lein
sudo mv lein /usr/local/bin/

# Verify installation
clj --version
# or
lein version

# Create new project with Leiningen
lein new app my-project
cd my-project

# Start REPL
lein repl
# or with CLI tools
clj

# Run application
lein run

# Build uberjar
lein uberjar

# Create deps.edn project (CLI tools)
mkdir my-project && cd my-project
cat > deps.edn << EOF
{:deps {org.clojure/clojure {:mvn/version "1.11.1"}}}
EOF
```

### Basic Syntax and Data Structures

```clojure
;; Numbers
(def integer 42)
(def floating 3.14)
(def ratio 22/7)

;; Strings
(def greeting "Hello, World!")
(def multiline "Line 1
                Line 2")

;; Keywords (interned strings)
(def my-key :keyword)
(def namespaced ::local-key)

;; Symbols
(def my-symbol 'symbol)

;; Vectors (indexed collection)
(def my-vector [1 2 3 4 5])
(def nested-vector [[1 2] [3 4]])

;; Lists (linked list)
(def my-list '(1 2 3 4 5))
(def computed-list (list 1 2 3))

;; Maps (key-value pairs)
(def person {:name "Alice"
             :age 30
             :email "alice@example.com"})

;; Sets (unique values)
(def my-set #{1 2 3 4 5})

;; Functions
(defn greet
  "Greet a person by name"
  [name]
  (str "Hello, " name "!"))

;; Multi-arity functions
(defn greet-multi
  ([name]
   (str "Hello, " name "!"))
  ([first-name last-name]
   (str "Hello, " first-name " " last-name "!")))

;; Anonymous functions
(def add (fn [x y] (+ x y)))
(def multiply #(* %1 %2))

;; Let bindings
(defn calculate [x y]
  (let [sum (+ x y)
        product (* x y)]
    {:sum sum
     :product product}))

;; Destructuring
(defn process-person [{:keys [name age]}]
  (str name " is " age " years old"))

(defn first-two [[a b]]
  [a b])

;; Conditional logic
(defn absolute [x]
  (if (< x 0)
    (- x)
    x))

(defn classify [x]
  (cond
    (< x 0) :negative
    (> x 0) :positive
    :else :zero))

(defn check-value [x]
  (case x
    1 "one"
    2 "two"
    3 "three"
    "other"))

;; Example usage
(comment
  (greet "Alice")
  (greet-multi "Bob" "Smith")
  (calculate 10 20)
  (process-person person)
  (classify 5))
```

### Functional Programming Patterns

```clojure
(ns my-app.functional
  (:require [clojure.string :as str]))

;; Map, filter, reduce
(defn process-numbers [numbers]
  (->> numbers
       (filter even?)
       (map #(* % 2))
       (reduce +)))

;; Threading macros
(defn transform-string [s]
  (-> s
      str/trim
      str/lower-case
      (str/replace #"\s+" "-")))

;; Thread-last macro
(defn compute-stats [data]
  (->> data
       (filter pos?)
       (map #(* % %))
       (reduce +)
       Math/sqrt))

;; Partial application
(def add-five (partial + 5))
(def multiply-by-two (partial * 2))

;; Function composition
(def transform (comp str/upper-case str/trim))

;; Higher-order functions
(defn apply-twice [f x]
  (f (f x)))

(defn make-adder [n]
  (fn [x] (+ x n)))

;; Recursion with recur (tail-call optimization)
(defn factorial [n]
  (loop [n n
         acc 1]
    (if (<= n 1)
      acc
      (recur (dec n) (* acc n)))))

;; Lazy sequences
(defn fibonacci []
  ((fn fib [a b]
     (lazy-seq (cons a (fib b (+ a b)))))
   0 1))

(defn primes []
  (letfn [(sieve [s]
            (cons (first s)
                  (lazy-seq
                   (sieve (filter #(not= 0 (mod % (first s)))
                                  (rest s))))))]
    (sieve (iterate inc 2))))

;; Transducers (composable transformations)
(def xf
  (comp
   (filter even?)
   (map #(* % 2))
   (take 10)))

(defn use-transducer []
  (transduce xf + (range 100)))

;; Reduce with early termination
(defn find-first-even [numbers]
  (reduce
   (fn [_ x]
     (when (even? x)
       (reduced x)))
   nil
   numbers))

;; Group and aggregate
(defn analyze-data [data]
  (->> data
       (group-by :category)
       (map (fn [[k v]]
              [k {:count (count v)
                  :sum (reduce + (map :value v))}]))
       (into {})))

;; Example usage
(comment
  (process-numbers [1 2 3 4 5 6])
  (transform-string "  Hello World  ")
  (add-five 10)
  ((make-adder 5) 10)
  (take 10 (fibonacci))
  (take 10 (primes))
  (use-transducer))
```

### Concurrency Patterns

```clojure
(ns my-app.concurrency
  (:require [clojure.core.async :as async :refer [go go-loop <! >! chan]]))

;; Atoms (synchronous, atomic updates)
(def counter (atom 0))

(defn increment-counter []
  (swap! counter inc))

(defn add-to-counter [n]
  (swap! counter + n))

(defn update-state [state]
  (atom state))

;; Refs (coordinated, synchronous updates with STM)
(def account1 (ref 1000))
(def account2 (ref 2000))

(defn transfer [from to amount]
  (dosync
   (alter from - amount)
   (alter to + amount)))

;; Agents (asynchronous updates)
(def logger (agent []))

(defn log-message [log msg]
  (conj log msg))

(defn async-log [msg]
  (send logger log-message msg))

;; Futures and promises
(defn expensive-computation [x]
  (Thread/sleep 1000)
  (* x x))

(defn parallel-computation []
  (let [f1 (future (expensive-computation 10))
        f2 (future (expensive-computation 20))]
    (+ @f1 @f2)))

(defn use-promise []
  (let [p (promise)]
    (future
      (Thread/sleep 1000)
      (deliver p "result"))
    @p))

;; Core.async channels
(defn async-pipeline []
  (let [in-chan (chan)
        out-chan (chan)]

    ;; Producer
    (go
      (dotimes [i 10]
        (>! in-chan i)
        (async/<! (async/timeout 100))))

    ;; Processor
    (go-loop []
      (when-let [value (<! in-chan)]
        (>! out-chan (* value 2))
        (recur)))

    ;; Consumer
    (go-loop []
      (when-let [value (<! out-chan)]
        (println "Received:" value)
        (recur)))))

;; Channel operations
(defn channel-patterns []
  (let [c1 (chan)
        c2 (chan)]

    ;; Buffered channel
    (let [buf-chan (chan 10)]
      buf-chan)

    ;; Alt/alts (select from multiple channels)
    (go
      (let [[v ch] (async/alts! [c1 c2])]
        (println "Received" v "from" ch)))

    ;; Timeout
    (go
      (let [[v ch] (async/alts! [c1 (async/timeout 1000)])]
        (if (= ch c1)
          (println "Got value:" v)
          (println "Timeout!"))))))

;; Pipeline processing
(defn process-pipeline [data]
  (let [input (chan 100)
        output (chan 100)]

    ;; Put data on channel
    (async/onto-chan! input data false)

    ;; Parallel processing pipeline
    (async/pipeline 4
                    output
                    (map #(* % 2))
                    input)

    ;; Collect results
    (async/<!! (async/into [] output))))

;; Example usage
(comment
  ;; Atoms
  (increment-counter)
  @counter

  ;; Refs
  (transfer account1 account2 100)
  [@account1 @account2]

  ;; Agents
  (async-log "Hello")
  @logger

  ;; Futures
  (parallel-computation)

  ;; Core.async
  (async-pipeline))
```

### Macros and Metaprogramming

```clojure
(ns my-app.macros)

;; Simple macro
(defmacro unless [test then]
  `(if (not ~test)
     ~then))

;; Macro with multiple forms
(defmacro when-let* [bindings & body]
  `(let ~bindings
     (when (every? some? ~(vec (take-nth 2 bindings)))
       ~@body)))

;; Debug macro
(defmacro debug [expr]
  `(let [result# ~expr]
     (println "Debug:" '~expr "=" result#)
     result#))

;; Benchmark macro
(defmacro bench [expr]
  `(let [start# (System/nanoTime)
         result# ~expr
         end# (System/nanoTime)]
     {:result result#
      :time-ms (/ (- end# start#) 1000000.0)}))

;; DSL for building queries
(defmacro select [& clauses]
  (let [fields (first clauses)
        from (nth clauses 2)
        where (when (= (nth clauses 3 nil) :where)
                (nth clauses 4))]
    {:fields fields
     :from from
     :where where}))

;; Threading macro variations
(defmacro some-> [expr & forms]
  (let [g (gensym)
        steps (map (fn [step] `(if (nil? ~g) nil (-> ~g ~step)))
                   forms)]
    `(let [~g ~expr
           ~@(interleave (repeat g) (butlast steps))]
       ~(if (empty? steps)
          g
          (last steps)))))

;; Anaphoric macro (uses implicit variable)
(defmacro alet [bindings & body]
  `(let [~@bindings
         ~'it ~(last bindings)]
     ~@body))

;; Compile-time computation
(defmacro compile-time-fib [n]
  (letfn [(fib [n]
            (if (<= n 1)
              n
              (+ (fib (- n 1)) (fib (- n 2)))))]
    (fib n)))

;; Code generation
(defmacro defgetters [record-name & fields]
  `(do
     ~@(map (fn [field]
              `(defn ~(symbol (str "get-" (name field)))
                 [~'record]
                 (~(keyword field) ~'record)))
            fields)))

;; Example usage
(comment
  ;; Simple macro
  (unless false (println "This will print"))

  ;; Debug macro
  (debug (+ 1 2 3))

  ;; Benchmark
  (bench (reduce + (range 1000000)))

  ;; DSL
  (select [:name :age] :from :users :where [:> :age 18])

  ;; Compile-time
  (def fib-10 (compile-time-fib 10))

  ;; Code generation
  (defrecord Person [name age email])
  (defgetters Person name age email))
```

### ClojureScript and Web Development

```clojure
(ns my-app.web
  (:require [reagent.core :as r]
            [re-frame.core :as rf]))

;; Reagent component (React wrapper)
(defn greeting [name]
  [:div
   [:h1 "Hello, " name "!"]
   [:p "Welcome to ClojureScript"]])

;; Stateful component
(defn counter []
  (let [count (r/atom 0)]
    (fn []
      [:div
       [:p "Count: " @count]
       [:button {:on-click #(swap! count inc)} "Increment"]
       [:button {:on-click #(swap! count dec)} "Decrement"]])))

;; Re-frame (state management)
;; Events
(rf/reg-event-db
 :initialize
 (fn [_ _]
   {:count 0
    :users []}))

(rf/reg-event-db
 :increment
 (fn [db _]
   (update db :count inc)))

(rf/reg-event-db
 :add-user
 (fn [db [_ user]]
   (update db :users conj user)))

;; Subscriptions
(rf/reg-sub
 :count
 (fn [db _]
   (:count db)))

(rf/reg-sub
 :users
 (fn [db _]
   (:users db)))

;; Component using re-frame
(defn counter-reframe []
  (let [count (rf/subscribe [:count])]
    [:div
     [:p "Count: " @count]
     [:button {:on-click #(rf/dispatch [:increment])} "Increment"]]))

;; HTTP requests (with cljs-ajax)
(comment
  (require '[ajax.core :refer [GET POST]])

  (GET "/api/users"
       {:handler (fn [response]
                   (rf/dispatch [:set-users response]))
        :error-handler (fn [error]
                         (println "Error:" error))})

  (POST "/api/users"
        {:params {:name "Alice" :age 30}
         :handler (fn [response]
                    (println "Success:" response))}))

;; JavaScript interop
(defn js-interop-examples []
  ;; Access JS objects
  (js/console.log "Hello from ClojureScript")

  ;; Create JS object
  (let [obj #js {:name "Alice" :age 30}]
    (.-name obj))

  ;; Call JS methods
  (.toUpperCase "hello")

  ;; Convert to JS
  (clj->js {:a 1 :b 2})

  ;; Convert from JS
  (js->clj #js {:a 1 :b 2} :keywordize-keys true))
```
