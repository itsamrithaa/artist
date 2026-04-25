# ARTIST: Adaptive Real-Time Structural opTimization

ARTIST is a deep reinforcement learning framework designed for de-novo drug discovery. By navigating an astronomical chemical search space estimated between $10^{30}$ and $10^{60}$ molecules, ARTIST enables the autonomous creation of novel molecules from fundamental building blocks.

## The Framework

Unlike traditional brute-force methods that often discover invalid molecules, ARTIST utilizes a Human-in-the-loop optimization strategy. It provides an interactive dashboard that abstracts complex machine learning algorithms, allowing pharmacologists to directly engage with and choose optimal molecular structures in real-time.

## Core Architecture

- **Deep Q-Learning:** The agent utilizes a Deep Q-Network (DQN) architecture where a neural network approximates Q-values to make sequential decisions.
- **Q-Value Logic:** A Q-value represents the expected cumulative reward of taking a specific chemical action (like adding or removing atoms) given the current molecular state.
- **RDKit Simulator:** Acts as the environment where the agent performs actions and receives state updates.
- **De-novo Evolution:** Novel molecules are built from scratch in silico, significantly optimizing resources compared to exhaustive wet-lab experimentation.

## Multi-Objective Reward Function

To ensure molecules are not just theoretical but practical for a laboratory setting, ARTIST employs a Pareto-optimized reward function:

$$Reward = (QED \times 25.0) - (SAS \times 2.0) - Penalties$$

- **QED (Quantitative Estimate of Drug-likeness):** Prioritizes structural drug-likeness.
- **SAS (Synthetic Accessibility Score):** Penalizes structural complexity to ensure molecules are built through a synthetically feasible path.

## Benchmarked Results

When benchmarked against a stochastic (random) baseline, the ARTIST RL agent demonstrated a robust capacity for high-quality drug discovery:

| Metric | Random Baseline | RL Agent | Improvement |
|---|---|---|---|
| Avg QED | 0.48 | 0.74 | +54.82% |
| Avg SAS | 3.79 | 3.46 | +8.88% |
| Total Reward | 1.28 | 13.08 | +919.82% |
| Validity Rate | 100% | 100% | 0.00% |

## Tech Stack

- **Machine Learning:** PyTorch
- **Cheminformatics:** RDKit
- **Computation and Data:** NumPy and Matplotlib

## Future Directions

- **GNN Integration:** Replacing fingerprints with Graph Neural Networks (GNNs) to better capture 3D molecular topology.
- **High-Fidelity Rewards:** Integrating real protein-ligand docking scores to measure actual biological binding.
- **Expanded Libraries:** Increasing the range of available building block fragments in the library.

---

**Author:** Amrithaa Ashok Kumar  
**Affiliation:** Big Data and Analytics Association (BDAA)
