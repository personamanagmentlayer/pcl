---
name: quantum-algorithms-expert
version: 1.1.0
description: >-
  Develop production-ready quantum algorithms for optimization, simulation, and machine
  learning on near-term quantum devices. Use when the user mentions quantum computing,
  Qiskit or Cirq, quantum circuits, QAOA, VQE, Grover or Shor, or quantum machine learning
  on NISQ devices.
category: domains
tags:
  [
    quantum-computing,
    qiskit,
    quantum-algorithms,
    qaoa,
    vqe,
    quantum-ml,
    quantum-circuits,
    qubits,
  ]
allowed-tools:
  - Read
  - Write
  - Bash
  - Grep
  - Glob
metadata:
  author: PCL Standard Library
  complexity: expert
  estimated-time: 45 minutes
---

# Quantum Algorithms Expert

Develop production-ready quantum algorithms for optimization, simulation, and machine learning on near-term quantum devices.

## Learning Objectives

- Master quantum algorithm design and implementation
- Build quantum circuits using Qiskit and quantum SDKs
- Implement variational quantum algorithms (VQE, QAOA)
- Apply quantum machine learning techniques
- Optimize quantum circuits for real quantum hardware

## Prerequisites

- Strong linear algebra and complex numbers
- Understanding of quantum mechanics basics
- Python programming proficiency
- Knowledge of classical algorithms

## Core Concepts

### Quantum Bits (Qubits)

Fundamental unit of quantum information existing in superposition of |0⟩ and |1⟩ states. Enables exponential state space growth: n qubits represent 2^n states simultaneously.

### Quantum Gates & Circuits

Unitary operations manipulating qubit states. Single-qubit gates (X, Y, Z, H, T) and multi-qubit gates (CNOT, Toffoli) compose quantum circuits implementing algorithms.

### Quantum Entanglement

Quantum correlation where measuring one qubit instantly affects entangled qubits. Enables quantum parallelism and forms basis for quantum advantage over classical computing.

### Variational Quantum Algorithms

Hybrid quantum-classical algorithms for near-term devices. Classical optimizer tunes quantum circuit parameters to minimize cost function, enabling practical applications despite hardware limitations.

### Quantum Advantage

Scenarios where quantum algorithms outperform best known classical algorithms. Examples: Shor's factoring, Grover's search, quantum simulation, certain optimization problems.

## Best Practices

### Circuit Design

- Minimize circuit depth for NISQ devices
- Use native gate sets of target hardware
- Implement error mitigation techniques
- Reduce two-qubit gate count (main error source)
- Use ancilla qubits efficiently
- Design for specific quantum hardware topology
- Implement circuit optimization passes

### Algorithm Development

- Start with classical simulation and small systems
- Use variational approaches for near-term devices
- Implement hybrid quantum-classical workflows
- Validate against known solutions
- Profile quantum resource requirements
- Consider decoherence and gate fidelity
- Design error-resilient algorithms

### Optimization

- Use gradient-free optimizers for noisy landscapes
- Implement parameter shift rule for gradients
- Apply circuit compilation and transpilation
- Use measurement reduction techniques
- Batch quantum executions efficiently
- Implement adaptive measurement strategies
- Monitor convergence criteria

### Hardware Considerations

- Understand qubit connectivity constraints
- Account for device-specific error rates
- Use calibration data for optimization
- Implement quantum error correction when available
- Handle device queue times efficiently
- Monitor quantum volume and CLOPS metrics
- Test on simulators before real hardware

## Anti-Patterns

### Common Mistakes

- Using too many qubits for current hardware
- Ignoring noise and decoherence
- Not transpiling circuits for target hardware
- Excessive circuit depth
- Poor parameter initialization
- Not using error mitigation
- Inadequate classical optimization
- Treating quantum computer as classical accelerator

### Design Issues

- Implementing classical algorithms on quantum hardware
- Not leveraging quantum advantage properly
- Monolithic circuits without modular design
- Ignoring measurement overhead
- Poor qubit mapping to topology
- Not validating intermediate results
- Insufficient testing on simulators
- Missing cost-benefit analysis vs classical

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Code Examples](references/EXAMPLES.md) — Quantum Circuit Design with Qiskit

## Resources

### Quantum Development Frameworks

- Qiskit - IBM quantum SDK
- Cirq - Google quantum framework
- PennyLane - Quantum ML library
- Q# - Microsoft quantum language
- PyQuil - Rigetti quantum SDK
- Amazon Braket SDK

### Quantum Hardware Access

- IBM Quantum - Cloud quantum computers
- Amazon Braket - Multi-provider access
- Azure Quantum - Microsoft quantum cloud
- IonQ - Trapped ion systems
- Rigetti - Superconducting qubits
- D-Wave - Quantum annealing

### Learning Resources

- Qiskit Textbook - Comprehensive quantum computing guide
- Nielsen & Chuang - Quantum Computation textbook
- Quantum Algorithm Zoo
- arXiv quantum computing papers
- Quantum Computing Stack Exchange
- IBM Quantum Challenge

### Research & Community

- Quantum Open Source Foundation
- Unitary Fund - Quantum software grants
- QuTiP - Quantum toolbox in Python
- Quantum Computing Report
- IEEE Quantum Week
- Q2B Conference

---

_Part of the PCL Standard Library - Harness quantum computing for optimization, simulation, and machine learning breakthroughs._
