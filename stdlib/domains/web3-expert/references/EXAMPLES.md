# Web3 Expert — Code Examples

Reference material for the `web3-expert` skill. See [SKILL.md](../SKILL.md).

## Code Examples

### Advanced Smart Contract: ERC-20 Token with Governance

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title GovernanceToken
 * @dev ERC-20 token with voting, staking, and governance features
 */
contract GovernanceToken is ERC20, Ownable, ReentrancyGuard, Pausable {

    struct Proposal {
        uint256 id;
        address proposer;
        string description;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 startBlock;
        uint256 endBlock;
        bool executed;
        mapping(address => bool) hasVoted;
        mapping(address => uint256) votes;
    }

    struct StakeInfo {
        uint256 amount;
        uint256 stakedAt;
        uint256 lockPeriod;
        uint256 rewardDebt;
    }

    // Token economics
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens
    uint256 public constant STAKING_REWARD_RATE = 100; // 1% per period (basis points)
    uint256 public constant MIN_STAKE_PERIOD = 7 days;

    // Governance parameters
    uint256 public proposalCount;
    uint256 public proposalThreshold = 100_000 * 10**18; // 100k tokens to propose
    uint256 public quorumPercentage = 10; // 10% of total supply
    uint256 public votingPeriod = 17280; // ~3 days in blocks (15s/block)

    mapping(uint256 => Proposal) public proposals;
    mapping(address => StakeInfo) public stakes;
    mapping(address => uint256) public votingPower;

    uint256 public totalStaked;
    uint256 public rewardPool;

    event TokensStaked(address indexed user, uint256 amount, uint256 lockPeriod);
    event TokensUnstaked(address indexed user, uint256 amount, uint256 reward);
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string description);
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed proposalId);

    constructor() ERC20("GovernanceToken", "GOV") {
        _mint(msg.sender, MAX_SUPPLY);
    }

    /**
     * @dev Stake tokens to earn rewards and gain voting power
     */
    function stake(uint256 amount, uint256 lockPeriod) external nonReentrant whenNotPaused {
        require(amount > 0, "Cannot stake 0 tokens");
        require(lockPeriod >= MIN_STAKE_PERIOD, "Lock period too short");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");

        // If user already staking, harvest rewards first
        if (stakes[msg.sender].amount > 0) {
            _harvestRewards(msg.sender);
        }

        _transfer(msg.sender, address(this), amount);

        stakes[msg.sender] = StakeInfo({
            amount: stakes[msg.sender].amount + amount,
            stakedAt: block.timestamp,
            lockPeriod: lockPeriod,
            rewardDebt: 0
        });

        totalStaked += amount;

        // Voting power = staked amount * lock period multiplier
        uint256 multiplier = _calculateMultiplier(lockPeriod);
        votingPower[msg.sender] = stakes[msg.sender].amount * multiplier / 100;

        emit TokensStaked(msg.sender, amount, lockPeriod);
    }

    /**
     * @dev Unstake tokens after lock period
     */
    function unstake() external nonReentrant {
        StakeInfo storage stakeInfo = stakes[msg.sender];
        require(stakeInfo.amount > 0, "No active stake");
        require(
            block.timestamp >= stakeInfo.stakedAt + stakeInfo.lockPeriod,
            "Tokens still locked"
        );

        uint256 stakedAmount = stakeInfo.amount;
        uint256 reward = _calculateReward(msg.sender);

        totalStaked -= stakedAmount;
        votingPower[msg.sender] = 0;
        delete stakes[msg.sender];

        // Transfer staked tokens + rewards
        _transfer(address(this), msg.sender, stakedAmount);
        if (reward > 0 && rewardPool >= reward) {
            rewardPool -= reward;
            _mint(msg.sender, reward);
        }

        emit TokensUnstaked(msg.sender, stakedAmount, reward);
    }

    /**
     * @dev Create governance proposal
     */
    function propose(string memory description) external returns (uint256) {
        require(
            balanceOf(msg.sender) >= proposalThreshold ||
            votingPower[msg.sender] >= proposalThreshold,
            "Insufficient tokens to propose"
        );

        proposalCount++;
        Proposal storage newProposal = proposals[proposalCount];

        newProposal.id = proposalCount;
        newProposal.proposer = msg.sender;
        newProposal.description = description;
        newProposal.startBlock = block.number;
        newProposal.endBlock = block.number + votingPeriod;
        newProposal.executed = false;

        emit ProposalCreated(proposalCount, msg.sender, description);
        return proposalCount;
    }

    /**
     * @dev Cast vote on proposal
     */
    function castVote(uint256 proposalId, bool support) external {
        Proposal storage proposal = proposals[proposalId];

        require(proposalId > 0 && proposalId <= proposalCount, "Invalid proposal");
        require(block.number >= proposal.startBlock, "Voting not started");
        require(block.number <= proposal.endBlock, "Voting ended");
        require(!proposal.hasVoted[msg.sender], "Already voted");
        require(votingPower[msg.sender] > 0, "No voting power");

        uint256 weight = votingPower[msg.sender];
        proposal.hasVoted[msg.sender] = true;
        proposal.votes[msg.sender] = weight;

        if (support) {
            proposal.forVotes += weight;
        } else {
            proposal.againstVotes += weight;
        }

        emit VoteCast(proposalId, msg.sender, support, weight);
    }

    /**
     * @dev Execute passed proposal
     */
    function executeProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];

        require(block.number > proposal.endBlock, "Voting not ended");
        require(!proposal.executed, "Already executed");

        uint256 totalVotes = proposal.forVotes + proposal.againstVotes;
        uint256 quorum = totalSupply() * quorumPercentage / 100;

        require(totalVotes >= quorum, "Quorum not reached");
        require(proposal.forVotes > proposal.againstVotes, "Proposal rejected");

        proposal.executed = true;

        // Execute proposal logic here
        // This is a placeholder - actual execution would depend on proposal type

        emit ProposalExecuted(proposalId);
    }

    function _calculateReward(address user) private view returns (uint256) {
        StakeInfo storage stakeInfo = stakes[user];
        if (stakeInfo.amount == 0) return 0;

        uint256 stakeDuration = block.timestamp - stakeInfo.stakedAt;
        uint256 periods = stakeDuration / 30 days;

        return (stakeInfo.amount * STAKING_REWARD_RATE * periods) / 10000;
    }

    function _calculateMultiplier(uint256 lockPeriod) private pure returns (uint256) {
        // Longer lock periods get higher voting power
        if (lockPeriod >= 365 days) return 200; // 2x
        if (lockPeriod >= 180 days) return 150; // 1.5x
        if (lockPeriod >= 90 days) return 120;  // 1.2x
        return 100; // 1x
    }

    function _harvestRewards(address user) private {
        uint256 reward = _calculateReward(user);
        if (reward > 0 && rewardPool >= reward) {
            rewardPool -= reward;
            _mint(user, reward);
            stakes[user].rewardDebt += reward;
            stakes[user].stakedAt = block.timestamp;
        }
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function fundRewardPool(uint256 amount) external onlyOwner {
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        _transfer(msg.sender, address(this), amount);
        rewardPool += amount;
    }
}
```

### DeFi: Automated Market Maker (AMM) with Liquidity Pools

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SimpleDEX
 * @dev Constant product AMM (x * y = k) with liquidity pools
 */
contract SimpleDEX is ReentrancyGuard, Ownable {

    struct Pool {
        address tokenA;
        address tokenB;
        uint256 reserveA;
        uint256 reserveB;
        uint256 totalLiquidity;
        mapping(address => uint256) liquidity;
        uint256 fee; // basis points (e.g., 30 = 0.3%)
    }

    mapping(bytes32 => Pool) public pools;
    bytes32[] public poolIds;

    uint256 public constant MINIMUM_LIQUIDITY = 1000;

    event PoolCreated(bytes32 indexed poolId, address tokenA, address tokenB, uint256 fee);
    event LiquidityAdded(bytes32 indexed poolId, address indexed provider, uint256 amountA, uint256 amountB, uint256 liquidity);
    event LiquidityRemoved(bytes32 indexed poolId, address indexed provider, uint256 amountA, uint256 amountB, uint256 liquidity);
    event Swap(bytes32 indexed poolId, address indexed trader, address tokenIn, uint256 amountIn, uint256 amountOut);

    function createPool(
        address tokenA,
        address tokenB,
        uint256 fee
    ) external onlyOwner returns (bytes32) {
        require(tokenA != tokenB, "Identical tokens");
        require(tokenA != address(0) && tokenB != address(0), "Zero address");
        require(fee <= 1000, "Fee too high"); // Max 10%

        // Sort tokens to ensure consistent pool ID
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);

        bytes32 poolId = keccak256(abi.encodePacked(token0, token1));
        require(pools[poolId].tokenA == address(0), "Pool exists");

        Pool storage pool = pools[poolId];
        pool.tokenA = token0;
        pool.tokenB = token1;
        pool.fee = fee;

        poolIds.push(poolId);

        emit PoolCreated(poolId, token0, token1, fee);
        return poolId;
    }

    function addLiquidity(
        bytes32 poolId,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin
    ) external nonReentrant returns (uint256 amountA, uint256 amountB, uint256 liquidity) {
        Pool storage pool = pools[poolId];
        require(pool.tokenA != address(0), "Pool doesn't exist");

        if (pool.totalLiquidity == 0) {
            // First liquidity provider
            amountA = amountADesired;
            amountB = amountBDesired;
            liquidity = sqrt(amountA * amountB) - MINIMUM_LIQUIDITY;

            // Lock minimum liquidity permanently
            pool.liquidity[address(0)] = MINIMUM_LIQUIDITY;
        } else {
            // Calculate optimal amounts maintaining current ratio
            uint256 amountBOptimal = quote(amountADesired, pool.reserveA, pool.reserveB);

            if (amountBOptimal <= amountBDesired) {
                require(amountBOptimal >= amountBMin, "Insufficient B amount");
                amountA = amountADesired;
                amountB = amountBOptimal;
            } else {
                uint256 amountAOptimal = quote(amountBDesired, pool.reserveB, pool.reserveA);
                require(amountAOptimal <= amountADesired && amountAOptimal >= amountAMin, "Insufficient A amount");
                amountA = amountAOptimal;
                amountB = amountBDesired;
            }

            liquidity = min(
                (amountA * pool.totalLiquidity) / pool.reserveA,
                (amountB * pool.totalLiquidity) / pool.reserveB
            );
        }

        require(liquidity > 0, "Insufficient liquidity minted");

        // Transfer tokens
        IERC20(pool.tokenA).transferFrom(msg.sender, address(this), amountA);
        IERC20(pool.tokenB).transferFrom(msg.sender, address(this), amountB);

        // Update pool state
        pool.reserveA += amountA;
        pool.reserveB += amountB;
        pool.totalLiquidity += liquidity;
        pool.liquidity[msg.sender] += liquidity;

        emit LiquidityAdded(poolId, msg.sender, amountA, amountB, liquidity);
    }

    function removeLiquidity(
        bytes32 poolId,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin
    ) external nonReentrant returns (uint256 amountA, uint256 amountB) {
        Pool storage pool = pools[poolId];
        require(pool.liquidity[msg.sender] >= liquidity, "Insufficient liquidity");

        // Calculate token amounts
        amountA = (liquidity * pool.reserveA) / pool.totalLiquidity;
        amountB = (liquidity * pool.reserveB) / pool.totalLiquidity;

        require(amountA >= amountAMin && amountB >= amountBMin, "Insufficient output");

        // Update state
        pool.liquidity[msg.sender] -= liquidity;
        pool.totalLiquidity -= liquidity;
        pool.reserveA -= amountA;
        pool.reserveB -= amountB;

        // Transfer tokens
        IERC20(pool.tokenA).transfer(msg.sender, amountA);
        IERC20(pool.tokenB).transfer(msg.sender, amountB);

        emit LiquidityRemoved(poolId, msg.sender, amountA, amountB, liquidity);
    }

    function swap(
        bytes32 poolId,
        address tokenIn,
        uint256 amountIn,
        uint256 amountOutMin
    ) external nonReentrant returns (uint256 amountOut) {
        Pool storage pool = pools[poolId];
        require(tokenIn == pool.tokenA || tokenIn == pool.tokenB, "Invalid token");

        bool isTokenA = tokenIn == pool.tokenA;
        address tokenOut = isTokenA ? pool.tokenB : pool.tokenA;

        // Calculate output with fee (constant product formula)
        uint256 amountInWithFee = amountIn * (10000 - pool.fee) / 10000;

        if (isTokenA) {
            amountOut = getAmountOut(amountInWithFee, pool.reserveA, pool.reserveB);
            require(amountOut >= amountOutMin, "Insufficient output");

            IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
            IERC20(tokenOut).transfer(msg.sender, amountOut);

            pool.reserveA += amountIn;
            pool.reserveB -= amountOut;
        } else {
            amountOut = getAmountOut(amountInWithFee, pool.reserveB, pool.reserveA);
            require(amountOut >= amountOutMin, "Insufficient output");

            IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
            IERC20(tokenOut).transfer(msg.sender, amountOut);

            pool.reserveB += amountIn;
            pool.reserveA -= amountOut;
        }

        emit Swap(poolId, msg.sender, tokenIn, amountIn, amountOut);
    }

    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) public pure returns (uint256) {
        require(amountIn > 0 && reserveIn > 0 && reserveOut > 0, "Invalid amounts");
        uint256 numerator = amountIn * reserveOut;
        uint256 denominator = reserveIn + amountIn;
        return numerator / denominator;
    }

    function quote(uint256 amountA, uint256 reserveA, uint256 reserveB)
        public pure returns (uint256 amountB)
    {
        require(amountA > 0 && reserveA > 0 && reserveB > 0, "Invalid amounts");
        amountB = (amountA * reserveB) / reserveA;
    }

    function sqrt(uint256 x) private pure returns (uint256) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }

    function min(uint256 a, uint256 b) private pure returns (uint256) {
        return a < b ? a : b;
    }
}
```

### Web3 dApp Frontend Integration

```typescript
import { ethers } from 'ethers';
import { create } from 'ipfs-http-client';

interface WalletState {
  address: string | null;
  chainId: number | null;
  balance: string;
  provider: ethers.BrowserProvider | null;
  signer: ethers.Signer | null;
}

class Web3Manager {
  private state: WalletState = {
    address: null,
    chainId: null,
    balance: '0',
    provider: null,
    signer: null,
  };

  private ipfs: any;
  private contracts: Map<string, ethers.Contract> = new Map();

  constructor() {
    // Initialize IPFS client
    this.ipfs = create({
      host: 'ipfs.infura.io',
      port: 5001,
      protocol: 'https',
    });
  }

  async connectWallet(): Promise<WalletState> {
    if (!window.ethereum) {
      throw new Error('MetaMask not installed');
    }

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();
      const balance = await provider.getBalance(address);

      this.state = {
        address,
        chainId: Number(network.chainId),
        balance: ethers.formatEther(balance),
        provider,
        signer,
      };

      // Setup event listeners
      this.setupEventListeners();

      return this.state;
    } catch (error) {
      console.error('Wallet connection failed:', error);
      throw error;
    }
  }

  private setupEventListeners(): void {
    if (!window.ethereum) return;

    window.ethereum.on('accountsChanged', async (accounts: string[]) => {
      if (accounts.length === 0) {
        this.disconnect();
      } else {
        await this.connectWallet();
      }
    });

    window.ethereum.on('chainChanged', () => {
      window.location.reload();
    });
  }

  disconnect(): void {
    this.state = {
      address: null,
      chainId: null,
      balance: '0',
      provider: null,
      signer: null,
    };
    this.contracts.clear();
  }

  loadContract(address: string, abi: any, name: string): ethers.Contract {
    if (!this.state.signer) {
      throw new Error('Wallet not connected');
    }

    const contract = new ethers.Contract(address, abi, this.state.signer);
    this.contracts.set(name, contract);
    return contract;
  }

  async stakeTokens(
    contractName: string,
    amount: string,
    lockPeriod: number
  ): Promise<ethers.TransactionReceipt> {
    const contract = this.contracts.get(contractName);
    if (!contract) throw new Error('Contract not loaded');

    const amountWei = ethers.parseEther(amount);

    try {
      const tx = await contract.stake(amountWei, lockPeriod);
      console.log('Transaction sent:', tx.hash);

      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      return receipt;
    } catch (error: any) {
      if (error.code === 'ACTION_REJECTED') {
        throw new Error('Transaction rejected by user');
      }
      throw error;
    }
  }

  async swapTokens(
    dexContract: string,
    poolId: string,
    tokenIn: string,
    amountIn: string,
    minAmountOut: string
  ): Promise<ethers.TransactionReceipt> {
    const contract = this.contracts.get(dexContract);
    if (!contract) throw new Error('DEX contract not loaded');

    const amountInWei = ethers.parseEther(amountIn);
    const minOutWei = ethers.parseEther(minAmountOut);

    const tx = await contract.swap(poolId, tokenIn, amountInWei, minOutWei);
    return await tx.wait();
  }

  async uploadToIPFS(data: any): Promise<string> {
    try {
      const jsonString = JSON.stringify(data);
      const result = await this.ipfs.add(jsonString);
      return result.path; // Returns CID
    } catch (error) {
      console.error('IPFS upload failed:', error);
      throw error;
    }
  }

  async fetchFromIPFS(cid: string): Promise<any> {
    try {
      const chunks = [];
      for await (const chunk of this.ipfs.cat(cid)) {
        chunks.push(chunk);
      }
      const data = Buffer.concat(chunks).toString();
      return JSON.parse(data);
    } catch (error) {
      console.error('IPFS fetch failed:', error);
      throw error;
    }
  }

  async estimateGas(
    contractName: string,
    method: string,
    ...args: any[]
  ): Promise<string> {
    const contract = this.contracts.get(contractName);
    if (!contract) throw new Error('Contract not loaded');

    const gasEstimate = await contract[method].estimateGas(...args);
    const gasPrice = await this.state.provider!.getFeeData();

    const totalCost = gasEstimate * (gasPrice.gasPrice || 0n);
    return ethers.formatEther(totalCost);
  }

  getState(): WalletState {
    return { ...this.state };
  }
}

export default Web3Manager;
```
