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
  boss:        '0x21316E9C757314e62d33A836b5D66A58E937e0c3',
  governance:  '' // 治理合约（主网部署后填写，空 = 治理未启用）
};
const NET = { chainId: 97, chainIdHex: '0x61', rpcUrl: 'https://data-seed-prebsc-1-s1.bnbchain.org:8545', rpcFallbacks: ['https://data-seed-prebsc-1-s2.bnbchain.org:8545','https://bsc-testnet.drpc.org','https://bsc-testnet.publicnode.com'], name: 'BSC 测试网' };
const CONFIG = { confirmations: 3 };
const GAS_PRICE = 120000000n; // 0.12 gwei（BSC 测试网交易 gasPrice）

/* ============ ABI ============ */
const ABIs = {
  characters: [
    "function owner() view returns (address)",
    "function heroes(uint256) view returns (uint8 element,uint32 basePower,uint16 level,uint64 xp,uint8 stamina,uint64 lastStamina,uint8 skin)",
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
    // 铸造限额（V4）
    "function maxMintPerAddr() view returns (uint256)",
    "function mintedOf(address) view returns (uint256)",
    "function setMaxMintPerAddr(uint256)",
    // 邀请短码（V6）
    "function registerReferrerCode(string)",
    "function resolveReferrerCode(string) view returns (address)",
    "function referrerCodeOf(address) view returns (bytes32)",
    "function codeOwnerOf(bytes32) view returns (address)",
    // 铸造强制邀请码（V7）
    "function referrerRequired() view returns (bool)",
    "function setReferrerRequired(bool)",
    "function setPendingReferrer(address)",
    "function pendingReferrerOf(address) view returns (address)",
    "function referrerOfAccount(address) view returns (address)",
    // 地址级推荐人（V8）：推荐人绑定玩家地址，该地址所有英雄（含市场购买）战斗胜利均给推荐人 10%
    "function bindAccountReferrer(address)",
    // V9/V10：下线列表与下线贡献奖励（链上直读，不依赖事件）
    "function downlineCount(address) view returns (uint256)",
    "function downlineAt(address,uint256) view returns (address)",
    "function downlineEarned(address) view returns (uint256)",
    "event AccountReferrerBound(address indexed player,address indexed referrer)",
    "event ReferrerRequiredSet(bool required)",
    "event PendingReferrerSet(address indexed player,address indexed referrer)",
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
    "function fightOnce(uint256,uint256,uint256,uint8)",
    "function levelUp(uint256)",
    "function monsters(uint256) view returns (string name,uint8 element,uint32 power,uint32 reward,uint32 xp)",
    "function monstersCount() view returns (uint256)",
    "function monstersLength() view returns (uint256)",
    "function monsterRegistry() view returns (address)",
    "function getFightPower(uint256,uint256) view returns (uint32)",
    "function playerCount() view returns (uint256)","function playerList(uint256) view returns (address)",
    "function stats(address) view returns (uint32 wins,uint32 fights,uint64 totalPower)",
    // 反作弊相关
    "function heroLocked(uint256) view returns (bool)",
    "function heroWinStreak(uint256) view returns (uint256)",
    "function playerLocked(address) view returns (bool)",
    "function playerHighLevelFights(address) view returns (uint256)",
    "function playerHighLevelWins(address) view returns (uint256)",
    "function maxWinStreak() view returns (uint256)",
    "function minFightsForCheck() view returns (uint256)",
    "function maxWinRateBp() view returns (uint256)",
    "function highLevelMonsterThreshold() view returns (uint256)",
    "function unlockHero(uint256)",
    "function unlockPlayer(address)",
    "function setMaxWinStreak(uint256)",
    "function setHighLevelMonsterThreshold(uint256)",
    // 战斗销毁（Burn-on-Fight）
    "function getFightBurnAmount() view returns (uint256)",
    "function burnThresholdLow() view returns (uint256)",
    "function burnThresholdMid() view returns (uint256)",
    "function burnThresholdHigh() view returns (uint256)",
    "function burnAmountLow() view returns (uint256)",
    "function burnAmountMid() view returns (uint256)",
    "function burnAmountHigh() view returns (uint256)",
    "function setBurnParams(uint256,uint256,uint256,uint256,uint256,uint256)",
    "event FightResult(address indexed player,uint256 indexed heroId,uint256 indexed monsterId,uint256 weaponId,bool win,uint256 reward,uint64 xpGained,uint32 effPower,uint16 winChanceBp,uint16 roll)",
    "event HeroLocked(uint256 indexed heroId,string reason)",
    "event PlayerLocked(address indexed player,string reason)",
    "event TokensBurnedForFight(address indexed player,uint256 amount,uint256 price)",
    "event RewardAccumulated(address indexed player,uint256 amount)",
    "event ReferralReward(address indexed referrer,uint256 indexed heroId,uint256 amount)"
  ],
  viewHelper: [
    "function previewFight(address,uint256,uint256,uint256) view returns (uint32 eff,uint16 chance)",
    "function getLeaderboard(address,uint256,uint256) view returns (address[] addrs,uint32[] wins,uint32[] fights,uint64[] powers)"
  ],
  vault: [
    "function getPendingReward(address) view returns (uint256)",
    "function getPendingReferral(address) view returns (uint256)",
    "function rewardMode() view returns (uint8)",
    "function usdt() view returns (address)",
    "function claim()",
    "function claimReferral()",
    "function totalClaimed(address) view returns (uint256)",
    "function totalClaimedUSDT(address) view returns (uint256)",
    "function totalClaimedReferral(address) view returns (uint256)",
    "function totalClaimedReferralUSDT(address) view returns (uint256)",
    "function vaultBalance() view returns (uint256)",
    "function setMyReferrerSplit(uint16)",
    "function referrerSplitBp(address) view returns (uint16)",
    "function getPendingCashback(address) view returns (uint256)",
    "function claimCashback()",
    "function totalClaimedCashback(address) view returns (uint256)",
    "function totalClaimedCashbackUSDT(address) view returns (uint256)",
    "function lastSplitChange(address) view returns (uint256)",
    "function cashbackBpOf(address) view returns (uint16)",
    "function SPLIT_COOLDOWN() view returns (uint256)"
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
  ],
  governance: [
    "function owner() view returns (address)",
    "function token() view returns (address)",
    "function votingPeriodBlocks() view returns (uint256)",
    "function passRateBp() view returns (uint256)",
    "function paused() view returns (bool)",
    "function proposalCount() view returns (uint256)",
    "function proposals(uint256) view returns (address target,address implementation,string title,string description,uint256 snapshotBlock,uint256 startBlock,uint256 endBlock,uint256 votesFor,uint256 votesAgainst,bool executed,bool canceled)",
    "function hasVoted(uint256,address) view returns (bool)",
    "function propose(address,address,string,string)",
    "function vote(uint256,bool)",
    "function execute(uint256)",
    "function cancel(uint256)",
    "function emergencyCancel(uint256)",
    "function pause()",
    "function unpause()",
    "event ProposalCreated(uint256 indexed id,address indexed proposer,address target,address implementation,string title,uint256 endBlock)",
    "event VoteCast(uint256 indexed id,address indexed voter,bool support,uint256 weight)",
    "event ProposalExecuted(uint256 indexed id,address target,address implementation)",
    "event ProposalCanceled(uint256 indexed id)",
    "event EmergencyCancel(uint256 indexed id,address admin)",
    "event Paused(address admin)",
    "event Unpaused(address admin)"
  ]
};
const REVEAL_ABI = {
  v3: ["function revealMintHero(uint256,uint256,uint256,string)"],
  forgeShop: ["function revealForgeWeapon(uint256,uint256,uint256)","function revealForgeWeapon10(uint256,uint256,uint256)","function revealForgeWeapon100(uint256,uint256,uint256)","function revealSynthesize(uint256,uint256,uint256)"],
  enhanceShop: ["function revealEnhance(uint256,uint256,uint256)"],
  boss: ["function revealAttack(uint256,uint256,uint256)"]
};
const ACTION_PROXY = { mintHero:'v3', forge:'forgeShop', synthesize:'forgeShop', enhance:'enhanceShop', bossAttack:'boss' };

/* ============ 代币展示符号（固定为 EH，忽略合约返回的 symbol） ============ */
const TOKEN_SYMBOL = 'EH';

/* ============ 状态 ============ */
const S = {
  mode:'readonly',
  provider:null, signer:null, account:null, chainId:null, readProvider:null,
  tab:'heroes',
  pending:[],
  heroes:[], weapons:[], monsters:[],
  mintLimit:4, // 铸造限额（maxMintPerAddr，0=不限制；链上读取后覆盖）
  shardsBal:{}, essenceBal:{}, tokenBal:0n, tokenDecimals:18, tokenSymbol:TOKEN_SYMBOL,
  vaultReward:0n, vaultMode:0, vaultSym:TOKEN_SYMBOL, vaultDec:18,
  marketList:[], marketPage:0, marketPageSize:12, marketTab:'list', marketFeeBp:200,
  marketFilterEl:null, marketFilterType:null, marketFilterLevel:null, marketFilterStar:null, marketFilterItem:null, marketFilterBand:null,
  marketSort:'default', marketTypeCounts:{0:0,1:0,2:0,3:0}, marketAvgPrice:0n, marketPriceTiers:null,
  myListFilterEl:null, myListFilterType:null, myListFilterLevel:null, myListFilterStar:null, myListFilterItem:null, myListFilterBand:null,
  myListSort:'default', myListTypeCounts:{0:0,1:0,2:0,3:0}, myListTotalValue:0n, myListPriceTiers:null,
  collapsedGroups:{}, weaponsFilterEl:null, weaponsFilterStar:null, weaponsSort:'bonus', weaponSearch:'',
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
