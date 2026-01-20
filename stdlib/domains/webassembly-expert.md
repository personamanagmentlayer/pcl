# WebAssembly Expert

---

skill_id: webassembly-expert
name: WebAssembly Expert
allowed-tools:

- Read
- Write
- Bash
- Grep
- Glob
  category: domains
  tags: [webassembly, wasm, wasi, rust, cpp, performance, browser, emscripten, wasmtime]
  version: 1.0.0
  author: PCL Standard Library
  dependencies: []
  complexity: expert
  estimated_time: 45 minutes
  objectives:
- Master WebAssembly module development and compilation
- Build high-performance WASM applications from Rust and C++
- Implement WASI for system-level capabilities
- Optimize WASM for size and execution speed
- Integrate WASM with JavaScript and web browsers
  prerequisites:
- Strong Rust or C++ programming skills
- Understanding of low-level systems programming
- Knowledge of web technologies (JavaScript, browsers)
- Familiarity with compilation toolchains
  outcome: Create production-ready WebAssembly modules for web and server environments with optimal performance and seamless JavaScript integration

---

## Core Concepts

### WebAssembly (WASM)

Binary instruction format designed as portable compilation target for high-level languages. Provides near-native performance in web browsers and enables code reuse across platforms.

### WASI (WebAssembly System Interface)

System interface specification enabling WASM to run outside browsers with access to system resources (files, network, environment) in a secure, sandboxed manner.

### Memory Management

Linear memory model where WASM modules access contiguous byte arrays. Requires careful management of memory allocation, deallocation, and sharing between WASM and JavaScript.

### Compilation Targets

Languages like Rust, C++, C, Go, and AssemblyScript can compile to WASM. Each provides different toolchains (rustc, Emscripten, TinyGo) with varying levels of optimization.

### JavaScript Interop

Bidirectional communication between WASM and JavaScript through imported/exported functions, shared memory, and typed arrays. Requires careful data marshalling and type conversions.

## Code Examples

### High-Performance Image Processing in Rust/WASM

```rust
// Cargo.toml
// [package]
// name = "image-processor"
// version = "0.1.0"
// edition = "2021"
//
// [lib]
// crate-type = ["cdylib"]
//
// [dependencies]
// wasm-bindgen = "0.2"
// image = { version = "0.24", default-features = false, features = ["png", "jpeg"] }
// console_error_panic_hook = "0.1"
// web-sys = { version = "0.3", features = ["console"] }

use wasm_bindgen::prelude::*;
use wasm_bindgen::Clamped;
use web_sys::{CanvasRenderingContext2d, ImageData};

// Initialize panic hook for better error messages
#[wasm_bindgen(start)]
pub fn init() {
    console_error_panic_hook::set_once();
}

/// Apply grayscale filter to image data
#[wasm_bindgen]
pub fn grayscale(data: &mut [u8], width: u32, height: u32) {
    for i in (0..data.len()).step_by(4) {
        let r = data[i] as f32;
        let g = data[i + 1] as f32;
        let b = data[i + 2] as f32;

        // Calculate luminance using weighted average
        let gray = (0.299 * r + 0.587 * g + 0.114 * b) as u8;

        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
        // Alpha channel (i+3) remains unchanged
    }
}

/// Apply sepia filter
#[wasm_bindgen]
pub fn sepia(data: &mut [u8], width: u32, height: u32) {
    for i in (0..data.len()).step_by(4) {
        let r = data[i] as f32;
        let g = data[i + 1] as f32;
        let b = data[i + 2] as f32;

        data[i] = ((r * 0.393) + (g * 0.769) + (b * 0.189)).min(255.0) as u8;
        data[i + 1] = ((r * 0.349) + (g * 0.686) + (b * 0.168)).min(255.0) as u8;
        data[i + 2] = ((r * 0.272) + (g * 0.534) + (b * 0.131)).min(255.0) as u8;
    }
}

/// Apply brightness adjustment
#[wasm_bindgen]
pub fn adjust_brightness(data: &mut [u8], width: u32, height: u32, factor: f32) {
    for i in (0..data.len()).step_by(4) {
        data[i] = (data[i] as f32 * factor).min(255.0) as u8;
        data[i + 1] = (data[i + 1] as f32 * factor).min(255.0) as u8;
        data[i + 2] = (data[i + 2] as f32 * factor).min(255.0) as u8;
    }
}

/// Apply Gaussian blur (simplified box blur)
#[wasm_bindgen]
pub fn blur(data: &[u8], output: &mut [u8], width: u32, height: u32, radius: u32) {
    let width = width as usize;
    let height = height as usize;
    let radius = radius as usize;

    // Horizontal pass
    let mut temp = vec![0u8; data.len()];

    for y in 0..height {
        for x in 0..width {
            let mut r = 0u32;
            let mut g = 0u32;
            let mut b = 0u32;
            let mut count = 0u32;

            for dx in 0..=(radius * 2) {
                let nx = x + dx;
                if nx >= radius && nx < width + radius {
                    let sample_x = (nx - radius).min(width - 1);
                    let idx = (y * width + sample_x) * 4;

                    r += data[idx] as u32;
                    g += data[idx + 1] as u32;
                    b += data[idx + 2] as u32;
                    count += 1;
                }
            }

            let idx = (y * width + x) * 4;
            temp[idx] = (r / count) as u8;
            temp[idx + 1] = (g / count) as u8;
            temp[idx + 2] = (b / count) as u8;
            temp[idx + 3] = data[idx + 3];
        }
    }

    // Vertical pass
    for y in 0..height {
        for x in 0..width {
            let mut r = 0u32;
            let mut g = 0u32;
            let mut b = 0u32;
            let mut count = 0u32;

            for dy in 0..=(radius * 2) {
                let ny = y + dy;
                if ny >= radius && ny < height + radius {
                    let sample_y = (ny - radius).min(height - 1);
                    let idx = (sample_y * width + x) * 4;

                    r += temp[idx] as u32;
                    g += temp[idx + 1] as u32;
                    b += temp[idx + 2] as u32;
                    count += 1;
                }
            }

            let idx = (y * width + x) * 4;
            output[idx] = (r / count) as u8;
            output[idx + 1] = (g / count) as u8;
            output[idx + 2] = (b / count) as u8;
            output[idx + 3] = temp[idx + 3];
        }
    }
}

/// Edge detection using Sobel operator
#[wasm_bindgen]
pub fn edge_detection(data: &[u8], output: &mut [u8], width: u32, height: u32) {
    let width = width as usize;
    let height = height as usize;

    // Sobel kernels
    let gx = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
    let gy = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];

    for y in 1..height - 1 {
        for x in 1..width - 1 {
            let mut pixel_x = 0i32;
            let mut pixel_y = 0i32;

            for ky in 0..3 {
                for kx in 0..3 {
                    let ny = y + ky - 1;
                    let nx = x + kx - 1;
                    let idx = (ny * width + nx) * 4;

                    // Convert to grayscale for edge detection
                    let gray = (data[idx] as i32 + data[idx + 1] as i32 + data[idx + 2] as i32) / 3;

                    pixel_x += gray * gx[ky][kx];
                    pixel_y += gray * gy[ky][kx];
                }
            }

            let magnitude = ((pixel_x * pixel_x + pixel_y * pixel_y) as f64).sqrt();
            let edge = magnitude.min(255.0) as u8;

            let idx = (y * width + x) * 4;
            output[idx] = edge;
            output[idx + 1] = edge;
            output[idx + 2] = edge;
            output[idx + 3] = 255;
        }
    }
}

/// Complex image processing pipeline
#[wasm_bindgen]
pub struct ImageProcessor {
    width: u32,
    height: u32,
    data: Vec<u8>,
}

#[wasm_bindgen]
impl ImageProcessor {
    #[wasm_bindgen(constructor)]
    pub fn new(width: u32, height: u32) -> ImageProcessor {
        let size = (width * height * 4) as usize;
        ImageProcessor {
            width,
            height,
            data: vec![0; size],
        }
    }

    pub fn get_data_ptr(&self) -> *const u8 {
        self.data.as_ptr()
    }

    pub fn set_data(&mut self, data: &[u8]) {
        self.data.copy_from_slice(data);
    }

    pub fn apply_grayscale(&mut self) {
        grayscale(&mut self.data, self.width, self.height);
    }

    pub fn apply_sepia(&mut self) {
        sepia(&mut self.data, self.width, self.height);
    }

    pub fn apply_brightness(&mut self, factor: f32) {
        adjust_brightness(&mut self.data, self.width, self.height, factor);
    }

    pub fn apply_blur(&mut self, radius: u32) {
        let mut output = vec![0u8; self.data.len()];
        blur(&self.data, &mut output, self.width, self.height, radius);
        self.data = output;
    }

    pub fn apply_edge_detection(&mut self) {
        let mut output = vec![0u8; self.data.len()];
        edge_detection(&self.data, &mut output, self.width, self.height);
        self.data = output;
    }

    pub fn get_data(&self) -> Vec<u8> {
        self.data.clone()
    }
}

/// High-performance computation example: Monte Carlo Pi estimation
#[wasm_bindgen]
pub fn estimate_pi(iterations: u32) -> f64 {
    let mut inside_circle = 0u32;

    // Use simple LCG for random numbers (fast but not cryptographically secure)
    let mut seed = 12345u64;

    for _ in 0..iterations {
        // Generate random x, y in [0, 1]
        seed = (seed.wrapping_mul(1103515245).wrapping_add(12345)) & 0x7fffffff;
        let x = (seed as f64) / (0x7fffffff as f64);

        seed = (seed.wrapping_mul(1103515245).wrapping_add(12345)) & 0x7fffffff;
        let y = (seed as f64) / (0x7fffffff as f64);

        // Check if point is inside unit circle
        if x * x + y * y <= 1.0 {
            inside_circle += 1;
        }
    }

    4.0 * (inside_circle as f64) / (iterations as f64)
}

/// Memory-intensive operation: Matrix multiplication
#[wasm_bindgen]
pub fn matrix_multiply(a: &[f32], b: &[f32], n: usize) -> Vec<f32> {
    let mut result = vec![0.0f32; n * n];

    for i in 0..n {
        for j in 0..n {
            let mut sum = 0.0f32;
            for k in 0..n {
                sum += a[i * n + k] * b[k * n + j];
            }
            result[i * n + j] = sum;
        }
    }

    result
}
```

### JavaScript Integration and Performance Comparison

```javascript
// wasm-loader.js - Load and initialize WASM module

class WasmImageProcessor {
  constructor() {
    this.module = null;
    this.processor = null;
  }

  async init() {
    // Import WASM module
    const wasm = await import('./image_processor.js');
    await wasm.default();

    this.module = wasm;
    console.log('WASM module loaded successfully');
  }

  /**
   * Process image with WASM filters
   */
  async processImage(imageData, filters) {
    if (!this.module) {
      throw new Error('WASM module not initialized');
    }

    const { width, height, data } = imageData;

    // Create processor instance
    this.processor = new this.module.ImageProcessor(width, height);

    // Copy image data to WASM memory
    this.processor.set_data(data);

    // Apply filters in sequence
    for (const filter of filters) {
      switch (filter.type) {
        case 'grayscale':
          this.processor.apply_grayscale();
          break;
        case 'sepia':
          this.processor.apply_sepia();
          break;
        case 'brightness':
          this.processor.apply_brightness(filter.factor || 1.0);
          break;
        case 'blur':
          this.processor.apply_blur(filter.radius || 1);
          break;
        case 'edge':
          this.processor.apply_edge_detection();
          break;
      }
    }

    // Get processed data back
    const processedData = this.processor.get_data();

    return new ImageData(new Uint8ClampedArray(processedData), width, height);
  }

  /**
   * Benchmark WASM vs JavaScript performance
   */
  async benchmark(imageData, iterations = 100) {
    const { width, height, data } = imageData;

    // WASM benchmark
    const wasmStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      this.module.grayscale(data, width, height);
    }
    const wasmTime = performance.now() - wasmStart;

    // JavaScript benchmark
    const jsGrayscale = (data) => {
      for (let i = 0; i < data.length; i += 4) {
        const gray =
          0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        data[i] = data[i + 1] = data[i + 2] = gray;
      }
    };

    const jsStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      jsGrayscale(data);
    }
    const jsTime = performance.now() - jsStart;

    return {
      wasm: wasmTime,
      javascript: jsTime,
      speedup: (jsTime / wasmTime).toFixed(2) + 'x',
      wasmAvg: (wasmTime / iterations).toFixed(3) + 'ms',
      jsAvg: (jsTime / iterations).toFixed(3) + 'ms',
    };
  }

  /**
   * Compute-intensive task: Pi estimation
   */
  async estimatePi(iterations = 10000000) {
    const start = performance.now();
    const pi = this.module.estimate_pi(iterations);
    const time = performance.now() - start;

    return {
      pi,
      time: time.toFixed(2) + 'ms',
      iterations,
      error: Math.abs(Math.PI - pi),
    };
  }

  cleanup() {
    if (this.processor) {
      this.processor.free();
      this.processor = null;
    }
  }
}

// Usage example
async function main() {
  const processor = new WasmImageProcessor();
  await processor.init();

  // Load image
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const img = new Image();

  img.onload = async () => {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Apply filters
    const processedData = await processor.processImage(imageData, [
      { type: 'grayscale' },
      { type: 'brightness', factor: 1.2 },
      { type: 'blur', radius: 2 },
    ]);

    ctx.putImageData(processedData, 0, 0);

    // Benchmark
    const benchmark = await processor.benchmark(imageData);
    console.log('Benchmark results:', benchmark);

    // Compute-intensive task
    const piResult = await processor.estimatePi(10000000);
    console.log('Pi estimation:', piResult);

    processor.cleanup();
  };

  img.src = 'sample-image.jpg';
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
```

### WASI System Interface Example

```rust
// File: wasi-app/src/main.rs
// Cargo.toml:
// [dependencies]
// wasi = "0.11"

use std::fs::{File, OpenOptions};
use std::io::{Read, Write, BufReader, BufRead};
use std::env;
use std::path::Path;

fn main() {
    println!("WASI Application Starting...");

    // Read environment variables
    let args: Vec<String> = env::args().collect();
    println!("Arguments: {:?}", args);

    for (key, value) in env::vars() {
        println!("ENV: {} = {}", key, value);
    }

    // File operations
    if args.len() > 1 {
        let command = &args[1];

        match command.as_str() {
            "read" => {
                if args.len() > 2 {
                    read_file(&args[2]);
                }
            }
            "write" => {
                if args.len() > 3 {
                    write_file(&args[2], &args[3]);
                }
            }
            "process" => {
                if args.len() > 3 {
                    process_csv(&args[2], &args[3]);
                }
            }
            _ => {
                println!("Unknown command: {}", command);
            }
        }
    }
}

fn read_file(path: &str) {
    match File::open(path) {
        Ok(mut file) => {
            let mut contents = String::new();
            if let Err(e) = file.read_to_string(&mut contents) {
                eprintln!("Error reading file: {}", e);
                return;
            }
            println!("File contents:\n{}", contents);
        }
        Err(e) => {
            eprintln!("Error opening file: {}", e);
        }
    }
}

fn write_file(path: &str, content: &str) {
    match OpenOptions::new().write(true).create(true).open(path) {
        Ok(mut file) => {
            if let Err(e) = file.write_all(content.as_bytes()) {
                eprintln!("Error writing file: {}", e);
            } else {
                println!("Successfully wrote to {}", path);
            }
        }
        Err(e) => {
            eprintln!("Error creating file: {}", e);
        }
    }
}

fn process_csv(input_path: &str, output_path: &str) {
    let input_file = match File::open(input_path) {
        Ok(file) => file,
        Err(e) => {
            eprintln!("Error opening input file: {}", e);
            return;
        }
    };

    let output_file = match OpenOptions::new().write(true).create(true).open(output_path) {
        Ok(file) => file,
        Err(e) => {
            eprintln!("Error creating output file: {}", e);
            return;
        }
    };

    let reader = BufReader::new(input_file);
    let mut writer = std::io::BufWriter::new(output_file);

    // Process CSV: convert to uppercase and add row numbers
    for (index, line) in reader.lines().enumerate() {
        if let Ok(line) = line {
            let processed = format!("{},{}\n", index + 1, line.to_uppercase());
            if let Err(e) = writer.write_all(processed.as_bytes()) {
                eprintln!("Error writing output: {}", e);
            }
        }
    }

    println!("CSV processing complete");
}

// Build: cargo build --target wasm32-wasi --release
// Run with wasmtime:
// wasmtime run --dir=. target/wasm32-wasi/release/wasi-app.wasm read input.txt
```

## Best Practices

### Performance Optimization

- Minimize data copying between JavaScript and WASM
- Use shared memory (SharedArrayBuffer) for large datasets
- Batch operations to reduce boundary crossings
- Optimize for WASM instruction set (SIMD when available)
- Profile hot paths and optimize critical loops
- Use appropriate numeric types (i32, f32 for better performance)
- Enable compiler optimizations (opt-level, lto)

### Memory Management

- Carefully manage manual memory allocation in C/C++
- Use Rust's ownership system for memory safety
- Free WASM-allocated memory from JavaScript
- Avoid memory leaks by tracking allocations
- Use memory pools for frequent allocations
- Monitor and limit memory growth
- Implement proper cleanup on errors

### Module Design

- Keep module size small through code splitting
- Tree-shake unused dependencies
- Use wasm-opt for size optimization
- Lazy-load WASM modules when needed
- Version WASM modules for cache busting
- Provide fallbacks for unsupported browsers
- Design clear JavaScript API surface

### Development Workflow

- Use wasm-pack for Rust WASM builds
- Implement comprehensive testing (unit, integration)
- Set up CI/CD for WASM compilation
- Use browser DevTools for debugging
- Profile with browser performance tools
- Implement logging for production debugging
- Document JavaScript interop carefully

## Anti-Patterns

### Common Mistakes

- Excessive JavaScript ↔ WASM communication overhead
- Not handling WASM module load failures
- Copying large data unnecessarily
- Not freeing WASM-allocated memory
- Using WASM for tasks better suited to JavaScript
- Ignoring startup compilation time
- Not optimizing for bundle size

### Design Issues

- Monolithic WASM modules instead of modular design
- Synchronous WASM instantiation blocking UI
- Not leveraging WASM for CPU-intensive tasks
- Poor error handling across boundaries
- Inadequate testing on different browsers
- Not considering mobile device constraints
- Missing progressive enhancement strategy

## Resources

### Development Tools

- wasm-pack - Rust WASM build tool
- Emscripten - C/C++ to WASM compiler
- wasmtime - WASM runtime
- wasmer - Universal WASM runtime
- wasm-opt - WASM optimizer
- wasm-bindgen - Rust/JS interop

### Languages & Frameworks

- Rust - Systems language with excellent WASM support
- AssemblyScript - TypeScript-like for WASM
- C/C++ - Traditional systems languages
- Go (TinyGo) - Go for WASM
- Blazor - .NET framework for WASM
- Yew - Rust web framework

### Browser APIs

- WebAssembly JavaScript API
- WASM SIMD proposal
- WebAssembly Threads
- WebAssembly Reference Types
- WebAssembly Bulk Memory
- WebAssembly Multi-value

### Learning Resources

- WebAssembly.org - Official documentation
- MDN WebAssembly Guide
- Rust and WebAssembly Book
- Emscripten Documentation
- WASI documentation
- Awesome WASM - Curated resources

---

_Part of the PCL Standard Library - Unlock near-native performance in web applications with WebAssembly._
