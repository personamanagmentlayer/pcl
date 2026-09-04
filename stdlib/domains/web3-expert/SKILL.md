---
name: web3-expert
version: 1.1.0
description: >-
  Build production-ready Web3 applications including smart contracts, dApps, DeFi
  protocols, and decentralized storage solutions. Use when the user mentions Web3, smart
  contracts or Solidity, dApps, DeFi protocols, ethers.js or web3.js, IPFS, or on-chain
  integration with Ethereum-compatible networks.
category: domains
tags:
  [
    web3,
    blockchain,
    smart-contracts,
    solidity,
    dapps,
    defi,
    ipfs,
    ethereum,
    web3js,
    ethersjs,
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

# Web3 Expert

Build production-ready Web3 applications including smart contracts, dApps, DeFi protocols, and decentralized storage solutions.

## Learning Objectives

- Master smart contract development with Solidity
- Build decentralized applications (dApps)
- Implement DeFi protocols and mechanisms
- Integrate Web3.js and ethers.js libraries
- Deploy and interact with IPFS for decentralized storage

## Prerequisites

- Strong JavaScript/TypeScript fundamentals
- Understanding of blockchain concepts
- Knowledge of cryptographic principles
- Familiarity with Ethereum ecosystem

## Core Concepts

### Smart Contracts

Self-executing code deployed on blockchain networks that automatically enforce agreements without intermediaries. Written in Solidity for EVM-compatible chains, they enable trustless, transparent, and immutable transactions.

### Decentralized Applications (dApps)

Applications with backend logic running on decentralized networks rather than centralized servers. Frontend interfaces interact with smart contracts through Web3 libraries, providing censorship-resistant and transparent functionality.

### DeFi (Decentralized Finance)

Financial instruments and protocols built on blockchain without traditional intermediaries. Includes lending/borrowing, decentralized exchanges (DEXs), yield farming, liquidity pools, and automated market makers (AMMs).

### Web3 Libraries

JavaScript/TypeScript libraries (Web3.js, ethers.js) that enable interaction with Ethereum nodes, signing transactions, reading blockchain state, and connecting wallet providers like MetaMask.

### IPFS (InterPlanetary File System)

Peer-to-peer distributed file system for decentralized storage. Content-addressed storage ensures immutability and enables efficient distribution without centralized servers.

## Best Practices

### Smart Contract Development

- Follow checks-effects-interactions pattern to prevent reentrancy
- Use OpenZeppelin contracts for standard implementations
- Implement comprehensive access controls and pausability
- Always validate inputs and handle edge cases
- Emit events for all state changes for frontend tracking
- Use SafeMath or Solidity 0.8+ for overflow protection
- Conduct thorough testing and external audits before mainnet

### DeFi Protocol Design

- Implement circuit breakers for emergency situations
- Use oracle price feeds with safeguards against manipulation
- Design with composability in mind for protocol integration
- Calculate slippage protection for swaps and liquidity
- Implement time-locks for critical parameter changes
- Consider MEV (Maximal Extractable Value) attack vectors
- Provide clear documentation for economic mechanisms

### dApp Frontend Integration

- Handle network switches and wallet disconnections gracefully
- Always estimate gas before transactions
- Implement proper error handling for user experience
- Cache blockchain data appropriately to reduce RPC calls
- Use events and filters for real-time updates
- Implement transaction status monitoring and retries
- Provide clear feedback on pending transactions

### IPFS Best Practices

- Pin important content to ensure availability
- Use content addressing for immutability guarantees
- Implement gateway fallbacks for reliability
- Consider file size limits and chunking strategies
- Store IPFS CIDs on-chain, not full content
- Use encryption for sensitive data before upload
- Implement content moderation for user-generated data

## Anti-Patterns

### Common Mistakes

- Storing large data on-chain instead of using IPFS
- Not implementing reentrancy guards on token transfers
- Hardcoding gas limits instead of estimating
- Ignoring failed transactions without user feedback
- Using floating point arithmetic in Solidity
- Not validating external contract calls
- Deploying without comprehensive test coverage
- Ignoring smart contract upgrade strategies

### Security Issues

- Unchecked external calls leading to reentrancy
- Integer overflow/underflow in calculations
- Front-running vulnerabilities in DEX trades
- Oracle manipulation in price feeds
- Centralization risks in "decentralized" systems
- Private key exposure in frontend code
- Missing access controls on critical functions
- Inadequate testing of edge cases and attack vectors

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Code Examples](references/EXAMPLES.md) — Advanced Smart Contract: ERC-20 Token with Governance, DeFi: Automated Market Maker (AMM) with Liquidity Pools, Web3 dApp Frontend Integration

## Resources

### Development Tools

- Hardhat - Ethereum development environment
- Foundry - Fast Solidity testing framework
- Remix IDE - Browser-based Solidity IDE
- Truffle Suite - Smart contract development tools
- OpenZeppelin Contracts - Secure contract libraries
- Tenderly - Smart contract monitoring and debugging

### Web3 Libraries

- ethers.js - Complete Ethereum library
- Web3.js - Ethereum JavaScript API
- wagmi - React hooks for Ethereum
- viem - TypeScript Ethereum interface
- RainbowKit - Wallet connection UI
- WalletConnect - Multi-wallet protocol

### DeFi Resources

- Uniswap V3 - Leading DEX protocol
- Aave - Lending protocol
- Compound - DeFi lending platform
- Curve Finance - Stablecoin AMM
- Chainlink - Decentralized oracles
- The Graph - Blockchain indexing protocol

### Learning & Standards

- Ethereum.org - Official documentation
- Solidity docs - Language reference
- EIPs - Ethereum Improvement Proposals
- DeFi Developer Roadmap
- Smart Contract Best Practices
- CryptoZombies - Interactive Solidity tutorial

---

_Part of the PCL Standard Library - Build the decentralized future with Web3 technologies._
