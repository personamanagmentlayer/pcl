# Julia Expert — Code Examples

Reference material for the `julia-expert` skill. See [SKILL.md](../SKILL.md).

## Code Examples

### Installation and Setup

```bash
# Download Julia from https://julialang.org/downloads/

# Start Julia REPL
julia

# Package management in REPL
# Press ] to enter pkg mode
] add DataFrames
] add Plots
] add BenchmarkTools
] add CSV
] add Statistics

# Update packages
] update

# Create new project
] activate myproject
] add Package1 Package2

# Exit Julia
exit()

# Run script
julia script.jl

# Run with optimization
julia --optimize=3 script.jl

# Parallel execution
julia -p 4 parallel_script.jl
```

### Multiple Dispatch Fundamentals

```julia
# Basic multiple dispatch
function process(x::Int, y::Int)
    println("Processing two integers: $x + $y")
    x + y
end

function process(x::Float64, y::Float64)
    println("Processing two floats: $x * $y")
    x * y
end

function process(x::String, y::String)
    println("Processing two strings: $x$y")
    x * y  # String concatenation
end

# Parametric types
struct Point{T<:Real}
    x::T
    y::T
end

function distance(p1::Point{T}, p2::Point{T}) where T
    sqrt((p1.x - p2.x)^2 + (p1.y - p2.y)^2)
end

# Abstract types
abstract type Shape end

struct Circle <: Shape
    radius::Float64
end

struct Rectangle <: Shape
    width::Float64
    height::Float64
end

# Dispatch on abstract type
area(c::Circle) = π * c.radius^2
area(r::Rectangle) = r.width * r.height

# Multiple dispatch with type hierarchy
function draw(shape::Shape, color::String)
    println("Drawing $(typeof(shape)) in $color with area $(area(shape))")
end

# Varargs and dispatch
function sum_all(args::Int...)
    sum(args)
end

function sum_all(args::Float64...)
    sum(args) / length(args)
end

# Example usage
function main()
    # Multiple dispatch in action
    println(process(1, 2))           # Int method
    println(process(1.5, 2.5))       # Float64 method
    println(process("Hello", "World")) # String method

    # Parametric types
    p1 = Point(1.0, 2.0)
    p2 = Point(4.0, 6.0)
    println("Distance: $(distance(p1, p2))")

    # Abstract types
    circle = Circle(5.0)
    rect = Rectangle(4.0, 6.0)
    draw(circle, "red")
    draw(rect, "blue")
end

main()
```

### High-Performance Computing

```julia
using BenchmarkTools, LinearAlgebra, Statistics

# Type-stable function (fast)
function sum_stable(x::Vector{Float64})
    total = 0.0  # Type is known
    for i in eachindex(x)
        total += x[i]
    end
    total
end

# Type-unstable function (slow)
function sum_unstable(x::Vector{Float64})
    total = 0  # Int, then promoted to Float64
    for i in eachindex(x)
        total += x[i]
    end
    total
end

# In-place operations
function scale!(x::Vector{Float64}, factor::Float64)
    for i in eachindex(x)
        @inbounds x[i] *= factor
    end
    x
end

# SIMD optimization
function sum_simd(x::Vector{Float64})
    total = 0.0
    @simd for i in eachindex(x)
        @inbounds total += x[i]
    end
    total
end

# Matrix operations with BLAS
function matrix_multiply_efficient(A::Matrix{Float64}, B::Matrix{Float64})
    # Uses optimized BLAS routines
    A * B
end

# Preallocate arrays
function compute_values(n::Int)
    result = Vector{Float64}(undef, n)
    for i in 1:n
        result[i] = sin(i) + cos(i)
    end
    result
end

# Broadcasting (vectorized operations)
function apply_function(x::Vector{Float64})
    # Efficient element-wise operations
    y = @. sin(x) + cos(x)^2  # Fused broadcast
    y
end

# Memory-efficient views
function process_slice(A::Matrix{Float64}, row::Int)
    # No copying, just a view
    row_view = view(A, row, :)
    sum(row_view)
end

# GPU computing (requires CUDA.jl)
# using CUDA
# function gpu_computation(x::CuArray{Float64})
#     y = x .^ 2 .+ sin.(x)
#     sum(y)
# end

# Benchmarking
function benchmark_functions()
    x = rand(10000)

    println("Type-stable:")
    @btime sum_stable($x)

    println("\nType-unstable:")
    @btime sum_unstable($x)

    println("\nSIMD:")
    @btime sum_simd($x)

    println("\nBuilt-in:")
    @btime sum($x)
end

benchmark_functions()
```

### Scientific Computing

```julia
using LinearAlgebra, Statistics, Random, Distributions

# Linear algebra
function solve_linear_system()
    # Create system Ax = b
    A = [2.0 1.0; 1.0 3.0]
    b = [5.0; 8.0]

    # Solve
    x = A \ b
    println("Solution: $x")

    # Eigenvalues and eigenvectors
    eigenvals, eigenvecs = eigen(A)
    println("Eigenvalues: $eigenvals")

    # Matrix decompositions
    Q, R = qr(A)
    U, S, V = svd(A)

    return x
end

# Numerical integration
function integrate(f, a, b, n=1000)
    h = (b - a) / n
    sum = 0.5 * (f(a) + f(b))
    for i in 1:(n-1)
        x = a + i * h
        sum += f(x)
    end
    h * sum
end

# Differential equations (simple Euler method)
function euler_method(f, y0, t_span, dt)
    t_start, t_end = t_span
    t = t_start:dt:t_end
    y = zeros(length(t))
    y[1] = y0

    for i in 1:(length(t)-1)
        y[i+1] = y[i] + dt * f(t[i], y[i])
    end

    t, y
end

# Statistical analysis
function analyze_data(data::Vector{Float64})
    # Descriptive statistics
    μ = mean(data)
    σ = std(data)
    med = median(data)

    println("Mean: $μ")
    println("Std Dev: $σ")
    println("Median: $med")

    # Distributions
    dist = Normal(μ, σ)

    # Probability calculations
    p_value = cdf(dist, μ + σ)
    println("P(X ≤ μ+σ): $p_value")

    # Random sampling
    samples = rand(dist, 1000)

    return μ, σ, samples
end

# Monte Carlo simulation
function estimate_pi(n::Int)
    inside = 0
    for _ in 1:n
        x, y = rand(), rand()
        if x^2 + y^2 <= 1
            inside += 1
        end
    end
    4 * inside / n
end

# Optimization
function gradient_descent(f, ∇f, x0, α=0.01, max_iter=1000)
    x = x0
    for i in 1:max_iter
        grad = ∇f(x)
        x = x - α * grad

        if norm(grad) < 1e-6
            break
        end
    end
    x
end

# Example usage
function main()
    # Linear algebra
    solve_linear_system()

    # Integration
    result = integrate(sin, 0, π)
    println("\n∫sin(x)dx from 0 to π ≈ $result")

    # Differential equations
    f(t, y) = -y  # dy/dt = -y
    t, y = euler_method(f, 1.0, (0.0, 5.0), 0.01)
    println("\nODE solution at t=5: $(y[end])")

    # Statistics
    data = randn(1000)
    analyze_data(data)

    # Monte Carlo
    π_estimate = estimate_pi(1000000)
    println("\nπ ≈ $π_estimate")
end

main()
```

### Data Processing and Analysis

```julia
using DataFrames, CSV, Statistics, Dates

# Create DataFrame
function create_dataframe()
    df = DataFrame(
        name = ["Alice", "Bob", "Charlie", "David"],
        age = [25, 30, 35, 40],
        salary = [50000, 60000, 75000, 80000],
        department = ["Engineering", "Sales", "Engineering", "Marketing"]
    )
    df
end

# Data manipulation
function process_dataframe(df::DataFrame)
    # Filter rows
    engineers = filter(row -> row.department == "Engineering", df)

    # Select columns
    names_ages = select(df, :name, :age)

    # Transform columns
    df_with_bonus = transform(df, :salary => (x -> x * 1.1) => :salary_with_bonus)

    # Group by and aggregate
    dept_stats = combine(groupby(df, :department),
                        :salary => mean => :avg_salary,
                        :age => mean => :avg_age)

    # Sort
    sorted = sort(df, :salary, rev=true)

    # Join DataFrames
    df2 = DataFrame(name = ["Alice", "Bob"], bonus = [5000, 3000])
    joined = leftjoin(df, df2, on=:name)

    return dept_stats
end

# Reading and writing data
function io_operations()
    # Read CSV
    # df = CSV.read("data.csv", DataFrame)

    # Write CSV
    df = create_dataframe()
    # CSV.write("output.csv", df)

    # DataFrame to matrix
    matrix = Matrix(select(df, :age, :salary))

    # Missing data handling
    df_with_missing = DataFrame(
        x = [1, 2, missing, 4],
        y = [5, missing, 7, 8]
    )

    # Drop missing
    clean_df = dropmissing(df_with_missing)

    # Fill missing
    filled_df = coalesce.(df_with_missing, 0)

    return df
end

# Time series analysis
function analyze_timeseries()
    # Generate time series data
    dates = Date(2024, 1, 1):Day(1):Date(2024, 12, 31)
    values = cumsum(randn(length(dates)))

    ts = DataFrame(date = dates, value = values)

    # Calculate rolling statistics
    window = 7
    rolling_mean = [mean(ts.value[max(1, i-window+1):i]) for i in 1:length(ts.value)]

    ts.rolling_mean = rolling_mean

    # Seasonal decomposition (simplified)
    trend = rolling_mean
    detrended = ts.value - trend

    return ts
end

# Example usage
function main()
    # Create and process data
    df = create_dataframe()
    println("Original DataFrame:")
    println(df)

    stats = process_dataframe(df)
    println("\nDepartment Statistics:")
    println(stats)

    # Time series
    ts = analyze_timeseries()
    println("\nTime Series (first 5 rows):")
    println(first(ts, 5))
end

main()
```

### Parallel and Distributed Computing

```julia
using Distributed, SharedArrays

# Add worker processes
# addprocs(4)

# Parallel map
function parallel_computation()
    # Compute intensive function
    function expensive_compute(x)
        sum(sin(i) for i in 1:x)
    end

    # Serial
    @time serial_result = map(expensive_compute, 1:10000)

    # Parallel with pmap
    @time parallel_result = pmap(expensive_compute, 1:10000)

    return parallel_result
end

# Distributed arrays
function distributed_array_example()
    # Create shared array
    A = SharedArray{Float64}(1000, 1000)

    # Parallel initialization
    @sync @distributed for i in 1:size(A, 1)
        for j in 1:size(A, 2)
            A[i, j] = sin(i) + cos(j)
        end
    end

    # Parallel reduction
    total = @distributed (+) for i in 1:length(A)
        A[i]
    end

    return total
end

# Threading (lightweight parallelism)
function threaded_computation()
    n = 10000000
    result = zeros(n)

    Threads.@threads for i in 1:n
        result[i] = sin(i) + cos(i)
    end

    return sum(result)
end

# Example usage
function main()
    println("Number of threads: ", Threads.nthreads())

    # Threaded computation
    @time result = threaded_computation()
    println("Result: $result")
end

main()
```
