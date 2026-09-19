'use strict';

/* =================================================================
   合约地址
   ================================================================= */
const CONTRACTS = {
  gameToken:   '0xF3Aa1d13Ca2307d462506d9EB88B273166E145A8',
  characters:  '0xfE567116A40A5CB37801d15047F619e187f0C3D6',
  weapons:     '0xcE1CEac63127A5f526E0C497Ab91B838F899bfbB',
  shards:      '0x64d731f84323CFd7a0E44f5bfdee8D5175be38ba',
  essence:     '0x60c101926f8000691a17E27d19AF7a54C5745B2A',
  v3:          '0x1E66133b8d32a54bA12C7064f9085Cd3FB0029d8',
  forgeShop:   '0x66C3C273a359473845D5DBa852E171a01C0cd00b',
  enhanceShop: '0x2C84Ba6ffdbF16952eFbece29d83093837B4147D',
  randomOracle:'0x4D999B99397AB696AAddA032B8A1F3af2BFc8F06',
  oracle:      '0xB1AD6B80FbFAFbA4C884a943e50652183Aa45E2A',
  vault:       '0xbdeC90ED2e839261538AC72078026D73b8dA2E1A',
  marketplace: '0x686E3cE4d0aa25C7CFd6D4Bbbc670b8B35d5370A',
  boss:        '0x21316E9C757314e62d33A836b5D66A58E937e0c3'
};
const NET = { chainId: 97, chainIdHex: '0x61', rpcUrl: 'https://data-seed-prebsc-1-s1.bnbchain.org:8545', rpcFallbacks: ['https://data-seed-prebsc-1-s2.bnbchain.org:8545','https://bsc-testnet.drpc.org','https://bsc-testnet.publicnode.com'], name: 'BSC 测试网' };
const CONFIG = { confirmations: 3 };
const GAS_PRICE = 120000000n; // 0.12 gwei（BSC 测试网交易 gasPrice）

/* ============ ABI ============ */
const ABIs = {
  characters: [
    "function owner() view returns (address)",
    "function heroes(uint256) view returns (uint8 element,uint32 basePower,uint16 level,uint64 xp,uint8 stamina,uint64 lastStamina)",
    "function getStamina(uint256) view returns (uint8)",
    "function getStaminaInfo(uint256) view returns (uint8 currentStamina,uint256 staminaMax,uint256 recoveryInterval,uint256 secondsUntilNext)",
    "function staminaRegen() view returns (uint256)",
    "function maxStamina() view returns (uint8)",
    "function setStaminaRegen(uint256)",
    "function setMaxStamina(uint8)",
    "function heroPower(uint256) view returns (uint64)",
    "function tokensOfOwner(address) view returns (uint256[])",
    "function balanceOf(address) view returns (uint256)",
    "function isApprovedForAll(address,address) view returns (bool)",
    "function setApprovalForAll(address,bool)",
    "event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)"
  ],
  weapons: [
    "function owner() view returns (address)",
    "function weapons(uint256) view returns (uint8 stars,uint8 element,uint32 bonusBp)",
    "function tokensOfOwner(address) view returns (uint256[])",
    "function balanceOf(address) view returns (uint256)",
    "function isApprovedForAll(address,address) view returns (bool)",
    "function setApprovalForAll(address,bool)",
    "event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)"
  ],
  gameToken: ["function balanceOf(address) view returns (uint256)","function allowance(address,address) view returns (uint256)","function approve(address,uint256) returns (bool)","function decimals() view returns (uint8)","function symbol() view returns (string)"],
  shards: ["function balanceOf(address,uint256) view returns (uint256)","function balanceOfBatch(address[],uint256[]) view returns (uint256[])","function setApprovalForAll(address,bool)","function isApprovedForAll(address,address) view returns (bool)","event TransferSingle(address indexed operator,address indexed from,address indexed to,uint256 id,uint256 value)"],
  essence: ["function balanceOf(address,uint256) view returns (uint256)","function balanceOfBatch(address[],uint256[]) view returns (uint256[])","function setApprovalForAll(address,bool)","function isApprovedForAll(address,address) view returns (bool)","event TransferSingle(address indexed operator,address indexed from,address indexed to,uint256 id,uint256 value)"],
  forgeShop: [
    "function owner() view returns (address)",
    "function commitForgeWeapon(bytes32) returns (uint256)",
    "function commitForgeWeapon10(bytes32) returns (uint256)",
    "function commitForgeWeapon100(bytes32) returns (uint256)",
    "function commitSynthesize(bytes32,uint8) returns (uint256)",
    "function meltWeapon(uint256)","function meltWeapons(uint256[])","function composeEssence(uint8,uint256)",
    "event ForgeCommitted(address indexed player,uint256 indexed commitId,uint8 indexed forgeType)",
    "event WeaponForged(address indexed player,uint256 indexed tokenId,uint8 indexed stars,uint8 element,uint32 bonusBp)",
    "event ShardsDropped(address indexed player,uint256 indexed shardId,uint256 amount)",
    "event ForgeMissed(address indexed player)",
    "event SynthesizeCommitted(address indexed player,uint256 indexed commitId,uint8 indexed targetStars)",
    "event WeaponSynthesized(address indexed player,uint256 indexed tokenId,uint8 indexed stars,uint8 element,uint32 bonusBp,uint256 shardsBurned)",
    "event WeaponMelted(address indexed player,uint256 indexed weaponId,uint8 indexed stars,uint256 essenceId,uint256 essenceAmount)"
  ],
  enhanceShop: [
    "function owner() view returns (address)",
    "function commitEnhance(bytes32,uint256,uint256,uint8) returns (uint256)",
    "function composeEssence(uint8,uint256)",
    "event EnhanceCommitted(address indexed player,uint256 indexed commitId,uint256 indexed weaponId,uint256 amount,uint8 essenceTier)",
    "event WeaponEnhanced(address indexed player,uint256 indexed weaponId,uint8 indexed essenceTier,uint256 essenceUsed,uint32 bonusBpAdded,uint32 newBonusBp)",
    "event EssenceComposed(address indexed player,uint256 indexed fromId,uint256 indexed toId,uint256 burnAmount,uint256 mintAmount)"
  ],
  v3: [
    "function owner() view returns (address)",
    "function commitMintHero(bytes32) returns (uint256)",
    "function fight(uint256,uint256,uint256)",
    "function levelUp(uint256)",
    "function monsters(uint256) view returns (string name,uint8 element,uint32 power,uint32 reward,uint32 xp)",
    "function monstersCount() view returns (uint256)",
    "function getFightPower(uint256,uint256) view returns (uint32)",
    "function playerCount() view returns (uint256)","function playerList(uint256) view returns (address)",
    "function stats(address) view returns (uint32 wins,uint32 fights,uint64 totalPower)",
    "event FightResult(address indexed player,uint256 indexed heroId,uint256 indexed monsterId,uint256 weaponId,bool win,uint256 reward,uint64 xpGained,uint32 effPower,uint16 winChanceBp,uint16 roll)"
  ],
  viewHelper: [
    "function previewFight(address,uint256,uint256,uint256) view returns (uint32 eff,uint16 chance)",
    "function getLeaderboard(address,uint256,uint256) view returns (address[] addrs,uint32[] wins,uint32[] fights,uint64[] powers)"
  ],
  vault: [
    "function getPendingReward(address) view returns (uint256)",
    "function rewardMode() view returns (uint8)",
    "function usdt() view returns (address)",
    "function claim()"
  ],
  boss: [
    "function owner() view returns (address)",
    "function startRound(uint32)","function roundCount() view returns (uint256)",
    "function rounds(uint256) view returns (uint64 start,uint64 end,uint32 maxHp,uint32 hp,bool dead,bool weaponGiven,address weaponWinner,uint128 rewardPool,uint128 totalDamage)",
    "function commitAttack(bytes32,uint256,uint256) returns (uint256)",
    "function settleReward(uint256)","function playerDamage(uint256,address) view returns (uint256)","function attackersOf(uint256) view returns (address[])",
    "event BossAttacked(uint256 indexed rid,address indexed player,uint256 heroId,uint256 damage,uint32 hpLeft)"
  ],
  marketplace: [
    "function owner() view returns (address)","function marketFeeBp() view returns (uint256)","function setMarketFee(uint256)",
    "function listItem(uint8,uint256,uint256,uint256) returns (uint256)",
    "function buyItem(uint256)","function cancelListing(uint256)",
    "function getActiveListings() view returns (uint256[])",
    "function getListing(uint256) view returns (address seller,uint8 category,uint256 tokenId,uint256 amount,uint256 price,bool active)"
  ],
  oracle: [
    "function owner() view returns (address)",
    "function heroPriceUSD() view returns (uint256)","function weaponPriceUSD() view returns (uint256)",
    "function weapon10PriceUSD() view returns (uint256)","function weapon100PriceUSD() view returns (uint256)",
    "function getHeroCost() view returns (uint256)","function getWeaponCost() view returns (uint256)",
    "function getWeapon10Cost() view returns (uint256)","function getWeapon100Cost() view returns (uint256)",
    "function setPricing(uint256,uint256,uint256,uint256)"
  ],
  randomOracle: [
    "function getCommit(uint256) view returns (bytes32 hash,uint64 blockNumber,address committer,bool revealed)",
    "function minDelayBlocks() view returns (uint256)",
    "function maxDelayBlocks() view returns (uint256)"
  ]
};
const REVEAL_ABI = {
  v3: ["function revealMintHero(uint256,uint256,uint256,string)"],
  forgeShop: ["function revealForgeWeapon(uint256,uint256,uint256)","function revealForgeWeapon10(uint256,uint256,uint256)","function revealForgeWeapon100(uint256,uint256,uint256)","function revealSynthesize(uint256,uint256,uint256)"],
  enhanceShop: ["function revealEnhance(uint256,uint256,uint256)"],
  boss: ["function revealAttack(uint256,uint256,uint256)"]
};
const ACTION_PROXY = { mintHero:'v3', forge:'forgeShop', synthesize:'forgeShop', enhance:'enhanceShop', bossAttack:'boss' };

/* ============ 状态 ============ */
const S = {
  mode:'readonly',
  provider:null, signer:null, account:null, chainId:null, readProvider:null,
  tab:'heroes',
  pending:[],
  heroes:[], weapons:[], monsters:[],
  shardsBal:{}, essenceBal:{}, tokenBal:0n, tokenDecimals:18, tokenSymbol:'GAME',
  vaultReward:0n, vaultMode:0, vaultSym:'GAME', vaultDec:18,
  marketList:[], marketPage:0, marketPageSize:8, marketTab:'list', marketFeeBp:200,
  collapsedGroups:{}, weaponsFilterEl:null, weaponsFilterStar:null, weaponsSort:'bonus', weaponSearch:'', marketFilterEl:null,
  rankPage:0, rankSize:10,
  fight:{heroId:null, weaponId:null, monsterId:null},
  meltSel:new Set(), sellApproved:false, sellType:'0',
  boss:{rid:null, round:null, myDamage:0n, heroId:null, weaponId:null},
  fightW:{el:null, star:null}, bossW:{el:null, star:null},
  battleRecords:[],
  admin:{status:'idle', forAccount:null, isOwner:false, rows:[]},
  oracleCfg:{ minDelay:3, maxDelay:450 },
  busy:false
};
const c = {};
