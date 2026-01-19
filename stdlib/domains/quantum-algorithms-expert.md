# Quantum Algorithms Expert

---
skill_id: quantum-algorithms-expert
name: Quantum Algorithms Expert
category: domains
tags: [quantum-computing, qiskit, quantum-algorithms, qaoa, vqe, quantum-ml, quantum-circuits, qubits]
version: 1.0.0
author: PCL Standard Library
dependencies: []
complexity: expert
estimated_time: 45 minutes
objectives:
  - Master quantum algorithm design and implementation
  - Build quantum circuits using Qiskit and quantum SDKs
  - Implement variational quantum algorithms (VQE, QAOA)
  - Apply quantum machine learning techniques
  - Optimize quantum circuits for real quantum hardware
prerequisites:
  - Strong linear algebra and complex numbers
  - Understanding of quantum mechanics basics
  - Python programming proficiency
  - Knowledge of classical algorithms
outcome: Develop production-ready quantum algorithms for optimization, simulation, and machine learning on near-term quantum devices
---

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

## Code Examples

### Quantum Circuit Design with Qiskit

```python
"""
Advanced Quantum Algorithms using Qiskit
"""

from qiskit import QuantumCircuit, QuantumRegister, ClassicalRegister, transpile
from qiskit.circuit import Parameter
from qiskit.providers.aer import AerSimulator
from qiskit.visualization import plot_histogram, plot_bloch_multivector
from qiskit.quantum_info import Statevector
import numpy as np
from typing import List, Tuple, Dict, Optional
import matplotlib.pyplot as plt


class QuantumAlgorithms:
    """Collection of quantum algorithm implementations"""

    def __init__(self, backend='aer_simulator'):
        self.backend = AerSimulator() if backend == 'aer_simulator' else backend

    def create_bell_state(self) -> QuantumCircuit:
        """
        Create maximally entangled Bell state (|00⟩ + |11⟩) / √2
        Demonstrates quantum entanglement
        """
        qc = QuantumCircuit(2, 2)

        # Apply Hadamard gate to first qubit (superposition)
        qc.h(0)

        # Apply CNOT gate (entanglement)
        qc.cx(0, 1)

        # Measurement
        qc.measure([0, 1], [0, 1])

        return qc

    def quantum_teleportation(self) -> QuantumCircuit:
        """
        Implement quantum teleportation protocol
        Transfers quantum state from Alice to Bob using entanglement
        """
        qc = QuantumCircuit(3, 3)

        # Prepare state to teleport on qubit 0 (Alice's qubit)
        # For demonstration, create arbitrary state: α|0⟩ + β|1⟩
        qc.ry(np.pi/4, 0)  # Rotates to superposition state

        qc.barrier()

        # Create entangled pair (Bell state) between qubits 1 and 2
        qc.h(1)
        qc.cx(1, 2)

        qc.barrier()

        # Alice's operations
        qc.cx(0, 1)
        qc.h(0)

        # Alice's measurements
        qc.measure([0, 1], [0, 1])

        qc.barrier()

        # Bob's corrections based on Alice's measurements
        qc.cx(1, 2)
        qc.cz(0, 2)

        # Final measurement of teleported state
        qc.measure(2, 2)

        return qc

    def grover_search(self, oracle: List[int], num_qubits: int) -> QuantumCircuit:
        """
        Grover's algorithm for quantum search
        Provides quadratic speedup over classical search: O(√N) vs O(N)

        Args:
            oracle: List of indices to search for
            num_qubits: Number of qubits (search space = 2^n)
        """
        qc = QuantumCircuit(num_qubits, num_qubits)

        # Initialize superposition
        qc.h(range(num_qubits))

        # Calculate optimal number of iterations
        num_iterations = int(np.pi / 4 * np.sqrt(2 ** num_qubits / len(oracle)))

        for _ in range(num_iterations):
            # Oracle: mark target states
            self._apply_oracle(qc, oracle, num_qubits)

            # Diffusion operator (amplitude amplification)
            self._apply_diffusion(qc, num_qubits)

        # Measurement
        qc.measure(range(num_qubits), range(num_qubits))

        return qc

    def _apply_oracle(self, qc: QuantumCircuit, oracle: List[int], num_qubits: int):
        """Apply oracle that marks target states"""
        for target in oracle:
            # Convert target index to binary
            binary = format(target, f'0{num_qubits}b')

            # Apply X gates to flip qubits where binary is 0
            for i, bit in enumerate(binary):
                if bit == '0':
                    qc.x(i)

            # Multi-controlled Z gate
            if num_qubits == 2:
                qc.cz(0, 1)
            else:
                # Use multi-controlled Z (MCZ)
                qc.h(num_qubits - 1)
                qc.mct(list(range(num_qubits - 1)), num_qubits - 1)
                qc.h(num_qubits - 1)

            # Reverse X gates
            for i, bit in enumerate(binary):
                if bit == '0':
                    qc.x(i)

    def _apply_diffusion(self, qc: QuantumCircuit, num_qubits: int):
        """Apply Grover diffusion operator"""
        # Apply Hadamard gates
        qc.h(range(num_qubits))

        # Apply X gates
        qc.x(range(num_qubits))

        # Multi-controlled Z
        qc.h(num_qubits - 1)
        if num_qubits > 2:
            qc.mct(list(range(num_qubits - 1)), num_qubits - 1)
        else:
            qc.cx(0, 1)
        qc.h(num_qubits - 1)

        # Apply X gates
        qc.x(range(num_qubits))

        # Apply Hadamard gates
        qc.h(range(num_qubits))

    def quantum_fourier_transform(self, num_qubits: int) -> QuantumCircuit:
        """
        Quantum Fourier Transform (QFT)
        Core subroutine in many quantum algorithms including Shor's algorithm
        """
        qc = QuantumCircuit(num_qubits)

        for j in range(num_qubits):
            # Apply Hadamard gate
            qc.h(j)

            # Apply controlled phase rotations
            for k in range(j + 1, num_qubits):
                angle = 2 * np.pi / (2 ** (k - j + 1))
                qc.cp(angle, k, j)

        # Reverse qubit order
        for i in range(num_qubits // 2):
            qc.swap(i, num_qubits - i - 1)

        return qc

    def phase_estimation(
        self,
        unitary_circuit: QuantumCircuit,
        precision_qubits: int
    ) -> QuantumCircuit:
        """
        Quantum Phase Estimation algorithm
        Estimates eigenvalue phase of unitary operator
        """
        state_qubits = unitary_circuit.num_qubits
        total_qubits = precision_qubits + state_qubits

        qc = QuantumCircuit(total_qubits, precision_qubits)

        # Initialize precision qubits in superposition
        qc.h(range(precision_qubits))

        # Apply controlled unitary operations
        repetitions = 1
        for counting_qubit in range(precision_qubits):
            for _ in range(repetitions):
                # Controlled-U operation
                controlled_u = unitary_circuit.control()
                qc.append(
                    controlled_u,
                    [counting_qubit] + list(range(precision_qubits, total_qubits))
                )
            repetitions *= 2

        # Inverse QFT on precision qubits
        qft = self.quantum_fourier_transform(precision_qubits)
        qc.append(qft.inverse(), range(precision_qubits))

        # Measurement
        qc.measure(range(precision_qubits), range(precision_qubits))

        return qc


class VariationalQuantumEigensolver:
    """
    Variational Quantum Eigensolver (VQE)
    Hybrid algorithm for finding ground state energy of molecular Hamiltonians
    """

    def __init__(self, num_qubits: int):
        self.num_qubits = num_qubits
        self.backend = AerSimulator()

    def create_ansatz(self, params: List[float]) -> QuantumCircuit:
        """
        Create parameterized quantum circuit (ansatz)
        Uses hardware-efficient ansatz suitable for NISQ devices
        """
        qc = QuantumCircuit(self.num_qubits)

        # Layer of RY rotations
        for i in range(self.num_qubits):
            qc.ry(params[i], i)

        # Layer of entangling gates
        for i in range(self.num_qubits - 1):
            qc.cx(i, i + 1)

        # Second layer of rotations
        for i in range(self.num_qubits):
            qc.ry(params[self.num_qubits + i], i)

        return qc

    def measure_hamiltonian(
        self,
        circuit: QuantumCircuit,
        hamiltonian: Dict[str, float]
    ) -> float:
        """
        Measure expectation value of Hamiltonian
        Hamiltonian specified as dictionary: {'ZZII': -1.0, 'IXZX': 0.5, ...}
        """
        total_energy = 0.0

        for pauli_string, coefficient in hamiltonian.items():
            # Create measurement circuit
            meas_circuit = circuit.copy()
            self._add_pauli_measurement(meas_circuit, pauli_string)

            # Execute circuit
            meas_circuit.measure_all()
            transpiled = transpile(meas_circuit, self.backend)
            job = self.backend.run(transpiled, shots=1000)
            result = job.result()
            counts = result.get_counts()

            # Calculate expectation value
            expectation = self._calculate_expectation(counts, len(pauli_string))
            total_energy += coefficient * expectation

        return total_energy

    def _add_pauli_measurement(self, circuit: QuantumCircuit, pauli_string: str):
        """Add basis rotation gates for Pauli measurement"""
        for i, pauli in enumerate(pauli_string):
            if pauli == 'X':
                circuit.h(i)
            elif pauli == 'Y':
                circuit.sdg(i)
                circuit.h(i)
            # Z measurement is in computational basis (no gates needed)

    def _calculate_expectation(self, counts: Dict[str, int], num_qubits: int) -> float:
        """Calculate expectation value from measurement counts"""
        expectation = 0.0
        total_shots = sum(counts.values())

        for bitstring, count in counts.items():
            # Count number of 1s (parity)
            parity = bitstring.count('1') % 2
            sign = 1 if parity == 0 else -1
            expectation += sign * count / total_shots

        return expectation

    def optimize(
        self,
        hamiltonian: Dict[str, float],
        initial_params: Optional[List[float]] = None,
        max_iterations: int = 100
    ) -> Tuple[float, List[float]]:
        """
        Optimize circuit parameters to minimize energy
        Uses gradient descent or other classical optimizer
        """
        if initial_params is None:
            # Random initialization
            initial_params = np.random.uniform(0, 2*np.pi, 2 * self.num_qubits).tolist()

        def cost_function(params):
            circuit = self.create_ansatz(params)
            energy = self.measure_hamiltonian(circuit, hamiltonian)
            return energy

        # Simple gradient descent
        params = np.array(initial_params)
        learning_rate = 0.1
        energy_history = []

        for iteration in range(max_iterations):
            # Calculate gradient using parameter shift rule
            gradient = np.zeros_like(params)

            for i in range(len(params)):
                # Forward shift
                params_plus = params.copy()
                params_plus[i] += np.pi / 2
                energy_plus = cost_function(params_plus)

                # Backward shift
                params_minus = params.copy()
                params_minus[i] -= np.pi / 2
                energy_minus = cost_function(params_minus)

                # Gradient
                gradient[i] = (energy_plus - energy_minus) / 2

            # Update parameters
            params -= learning_rate * gradient

            # Calculate current energy
            current_energy = cost_function(params)
            energy_history.append(current_energy)

            if iteration % 10 == 0:
                print(f"Iteration {iteration}: Energy = {current_energy:.6f}")

            # Check convergence
            if iteration > 0 and abs(energy_history[-1] - energy_history[-2]) < 1e-6:
                print(f"Converged at iteration {iteration}")
                break

        final_energy = cost_function(params)
        return final_energy, params.tolist()


class QAOA:
    """
    Quantum Approximate Optimization Algorithm
    Solves combinatorial optimization problems on near-term quantum devices
    """

    def __init__(self, num_qubits: int, p_layers: int = 1):
        self.num_qubits = num_qubits
        self.p_layers = p_layers
        self.backend = AerSimulator()

    def create_qaoa_circuit(
        self,
        cost_hamiltonian: Dict[Tuple[int, int], float],
        gamma: List[float],
        beta: List[float]
    ) -> QuantumCircuit:
        """
        Create QAOA circuit for MaxCut problem

        Args:
            cost_hamiltonian: Edge weights {(i, j): weight}
            gamma: Cost Hamiltonian evolution angles
            beta: Mixer Hamiltonian evolution angles
        """
        qc = QuantumCircuit(self.num_qubits)

        # Initial state: uniform superposition
        qc.h(range(self.num_qubits))

        # Apply p layers
        for p in range(self.p_layers):
            # Cost Hamiltonian (problem-specific)
            for (i, j), weight in cost_hamiltonian.items():
                qc.rzz(2 * gamma[p] * weight, i, j)

            # Mixer Hamiltonian (X rotations)
            for i in range(self.num_qubits):
                qc.rx(2 * beta[p], i)

        return qc

    def solve_maxcut(
        self,
        graph_edges: List[Tuple[int, int, float]],
        max_iterations: int = 50
    ) -> Tuple[List[int], float]:
        """
        Solve MaxCut problem using QAOA

        Args:
            graph_edges: List of (node1, node2, weight)
            max_iterations: Optimization iterations

        Returns:
            best_cut: Binary assignment for maximum cut
            max_value: Maximum cut value
        """
        # Convert edges to Hamiltonian
        cost_hamiltonian = {(i, j): w for i, j, w in graph_edges}

        def cost_function(params):
            gamma = params[:self.p_layers]
            beta = params[self.p_layers:]

            circuit = self.create_qaoa_circuit(cost_hamiltonian, gamma, beta)
            circuit.measure_all()

            # Execute circuit
            transpiled = transpile(circuit, self.backend)
            job = self.backend.run(transpiled, shots=1000)
            result = job.result()
            counts = result.get_counts()

            # Calculate expected cut value
            expectation = 0.0
            total_shots = sum(counts.values())

            for bitstring, count in counts.items():
                cut_value = self._evaluate_cut(bitstring, graph_edges)
                expectation += cut_value * count / total_shots

            return -expectation  # Minimize negative (maximize positive)

        # Optimize parameters
        initial_params = np.random.uniform(0, 2*np.pi, 2 * self.p_layers)

        # Use scipy optimizer
        from scipy.optimize import minimize

        result = minimize(
            cost_function,
            initial_params,
            method='COBYLA',
            options={'maxiter': max_iterations}
        )

        # Get best solution
        optimal_params = result.x
        gamma_opt = optimal_params[:self.p_layers]
        beta_opt = optimal_params[self.p_layers:]

        # Sample final circuit
        final_circuit = self.create_qaoa_circuit(cost_hamiltonian, gamma_opt, beta_opt)
        final_circuit.measure_all()

        transpiled = transpile(final_circuit, self.backend)
        job = self.backend.run(transpiled, shots=1000)
        counts = job.result().get_counts()

        # Find best cut
        best_bitstring = max(counts.items(), key=lambda x: x[1])[0]
        best_cut = [int(b) for b in best_bitstring]
        max_value = self._evaluate_cut(best_bitstring, graph_edges)

        return best_cut, max_value

    def _evaluate_cut(
        self,
        bitstring: str,
        graph_edges: List[Tuple[int, int, float]]
    ) -> float:
        """Evaluate cut value for given bitstring assignment"""
        cut_value = 0.0

        for i, j, weight in graph_edges:
            # Contribution to cut if nodes in different partitions
            if bitstring[-(i+1)] != bitstring[-(j+1)]:
                cut_value += weight

        return cut_value


# Example usage
def demo_quantum_algorithms():
    """Demonstrate quantum algorithms"""

    qa = QuantumAlgorithms()

    # Bell state
    print("=== Bell State ===")
    bell_circuit = qa.create_bell_state()
    print(bell_circuit)

    # Grover's search
    print("\n=== Grover's Search ===")
    grover_circuit = qa.grover_search(oracle=[3], num_qubits=2)
    print(f"Searching for state |11⟩ (index 3)")

    # VQE
    print("\n=== Variational Quantum Eigensolver ===")
    vqe = VariationalQuantumEigensolver(num_qubits=2)

    # Simple H2 molecule Hamiltonian (example)
    hamiltonian = {
        'II': -1.0523,
        'IZ': 0.3979,
        'ZI': -0.3979,
        'ZZ': -0.0113,
        'XX': 0.1809
    }

    energy, params = vqe.optimize(hamiltonian, max_iterations=30)
    print(f"Ground state energy: {energy:.6f} Ha")

    # QAOA MaxCut
    print("\n=== QAOA MaxCut ===")
    qaoa = QAOA(num_qubits=4, p_layers=2)

    # Small graph: 4 nodes
    edges = [
        (0, 1, 1.0),
        (1, 2, 1.0),
        (2, 3, 1.0),
        (3, 0, 1.0),
        (0, 2, 1.0)
    ]

    best_cut, max_value = qaoa.solve_maxcut(edges, max_iterations=30)
    print(f"Best cut: {best_cut}")
    print(f"Max cut value: {max_value}")


if __name__ == '__main__':
    demo_quantum_algorithms()
```

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

*Part of the PCL Standard Library - Harness quantum computing for optimization, simulation, and machine learning breakthroughs.*
