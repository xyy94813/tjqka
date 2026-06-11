type Card = { rank: number; suit: string; code: string };

const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
const suits = ['h', 'd', 'c', 's'];
const rankValue: Record<string, number> = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, T: 10, J: 11, Q: 12, K: 13, A: 14 };

const buildDeck = (used: Card[]) => {
  const deck: Card[] = [];
  for (const rank of ranks) {
    for (const suit of suits) {
      const code = `${rank}${suit}`;
      if (!used.some((card) => card.code === code)) {
        deck.push({ rank: rankValue[rank], suit, code });
      }
    }
  }
  return deck;
};

const getHandCategory = (cards: Card[]): number => {
  const sorted = [...cards].sort((a, b) => b.rank - a.rank);
  const rankCounts = sorted.reduce<Record<number, number>>((acc, card) => {
    acc[card.rank] = (acc[card.rank] || 0) + 1;
    return acc;
  }, {});
  const counts = Object.entries(rankCounts)
    .map(([rank, count]) => ({ rank: Number(rank), count }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);
  const isFlush = suits.some((suit) => sorted.filter((card) => card.suit === suit).length >= 5);
  const distinctRanks = Array.from(new Set(sorted.map((card) => card.rank)));

  const isStraight = (() => {
    const allRanks = [...distinctRanks];
    if (allRanks[0] === 14) allRanks.push(1);
    for (let i = 0; i <= allRanks.length - 5; i += 1) {
      if (
        allRanks[i] - 1 === allRanks[i + 1] &&
        allRanks[i + 1] - 1 === allRanks[i + 2] &&
        allRanks[i + 2] - 1 === allRanks[i + 3] &&
        allRanks[i + 3] - 1 === allRanks[i + 4]
      ) {
        return true;
      }
    }
    return false;
  })();

  const isStraightFlush = (() => {
    for (const suit of suits) {
      const suited = sorted.filter((card) => card.suit === suit);
      if (suited.length < 5) continue;
      const suitedRanks = Array.from(new Set(suited.map((card) => card.rank)));
      if (suitedRanks[0] === 14) suitedRanks.push(1);
      for (let i = 0; i <= suitedRanks.length - 5; i += 1) {
        if (
          suitedRanks[i] - 1 === suitedRanks[i + 1] &&
          suitedRanks[i + 1] - 1 === suitedRanks[i + 2] &&
          suitedRanks[i + 2] - 1 === suitedRanks[i + 3] &&
          suitedRanks[i + 3] - 1 === suitedRanks[i + 4]
        ) {
          return true;
        }
      }
    }
    return false;
  })();

  if (isStraightFlush) return 8;
  if (counts[0].count === 4) return 7;
  if (counts[0].count === 3 && counts[1]?.count === 2) return 6;
  if (isFlush) return 5;
  if (isStraight) return 4;
  if (counts[0].count === 3) return 3;
  if (counts[0].count === 2 && counts[1]?.count === 2) return 2;
  if (counts[0].count === 2) return 1;
  return 0;
};

const getHandValue = (cards: Card[]) => {
  const sorted = [...cards].sort((a, b) => b.rank - a.rank);
  const rankCounts = sorted.reduce<Record<number, number>>((acc, card) => {
    acc[card.rank] = (acc[card.rank] || 0) + 1;
    return acc;
  }, {});
  const counts = Object.entries(rankCounts)
    .map(([rank, count]) => ({ rank: Number(rank), count }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);
  const distinctRanks = Array.from(new Set(sorted.map((card) => card.rank)));

  const isStraight = (() => {
    const allRanks = [...distinctRanks];
    if (allRanks[0] === 14) allRanks.push(1);
    for (let i = 0; i <= allRanks.length - 5; i += 1) {
      if (
        allRanks[i] - 1 === allRanks[i + 1] &&
        allRanks[i + 1] - 1 === allRanks[i + 2] &&
        allRanks[i + 2] - 1 === allRanks[i + 3] &&
        allRanks[i + 3] - 1 === allRanks[i + 4]
      ) {
        return allRanks[i];
      }
    }
    return 0;
  })();

  const isFlush = suits.some((suit) => sorted.filter((card) => card.suit === suit).length >= 5);

  const isStraightFlush = (() => {
    for (const suit of suits) {
      const suited = sorted.filter((card) => card.suit === suit);
      if (suited.length < 5) continue;
      const suitedRanks = Array.from(new Set(suited.map((card) => card.rank)));
      if (suitedRanks[0] === 14) suitedRanks.push(1);
      for (let i = 0; i <= suitedRanks.length - 5; i += 1) {
        if (
          suitedRanks[i] - 1 === suitedRanks[i + 1] &&
          suitedRanks[i + 1] - 1 === suitedRanks[i + 2] &&
          suitedRanks[i + 2] - 1 === suitedRanks[i + 3] &&
          suitedRanks[i + 3] - 1 === suitedRanks[i + 4]
        ) {
          return suitedRanks[i];
        }
      }
    }
    return 0;
  })();

  const topRanks = counts.map((item) => item.rank);
  const kickerRanks = sorted
    .filter((card) => !counts.slice(0, 2).some((item) => item.rank === card.rank))
    .map((card) => card.rank)
    .slice(0, 5 - Math.min(5, counts[0]?.count || 0));

  const category = (() => {
    if (isStraightFlush) return 8;
    if (counts[0].count === 4) return 7;
    if (counts[0].count === 3 && counts[1]?.count === 2) return 6;
    if (isFlush) return 5;
    if (isStraight) return 4;
    if (counts[0].count === 3) return 3;
    if (counts[0].count === 2 && counts[1]?.count === 2) return 2;
    if (counts[0].count === 2) return 1;
    return 0;
  })();

  const scoreParts = [category, ...topRanks, ...kickerRanks];
  return scoreParts.reduce((acc, value) => acc * 100 + value, 0);
};

const scoreBestHand = (cards: Card[]) => {
  let best = 0;
  const n = cards.length;
  for (let i = 0; i < n - 4; i += 1) {
    for (let j = i + 1; j < n - 3; j += 1) {
      for (let k = j + 1; k < n - 2; k += 1) {
        for (let l = k + 1; l < n - 1; l += 1) {
          for (let m = l + 1; m < n; m += 1) {
            const value = getHandValue([cards[i], cards[j], cards[k], cards[l], cards[m]]);
            if (value > best) best = value;
          }
        }
      }
    }
  }
  return best;
};

const sampleDefault = 2000;

type Result = any;

const calculateResult = (hero: Card[], board: Card[], playerCount: number, sampleRate = sampleDefault): Result => {
  const used = [...hero, ...board];
  const deck = buildDeck(used);
  const boardCount = board.length;
  const opponentCount = Math.max(1, playerCount - 1);
  const result: any = {
    wins: 0,
    ties: 0,
    losses: 0,
    total: 0,
    winRate: 0,
    tieRate: 0,
    lossRate: 0,
    categoryCounts: {
      0: 0,
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
      6: 0,
      7: 0,
      8: 0,
    },
    categoryProbabilities: {
      0: 0,
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
      6: 0,
      7: 0,
      8: 0,
    },
  };

  if (deck.length < 2) return result;

  const evaluateBoard = (heroCards: Card[], boardCards: Card[]) => scoreBestHand([...heroCards, ...boardCards]);

  const drawOpponents = (remainingDeck: Card[]) => {
    const opponents: Card[][] = [];
    const deckCopy = [...remainingDeck];
    for (let n = 0; n < opponentCount; n += 1) {
      const hand: Card[] = [];
      for (let k = 0; k < 2; k += 1) {
        const index = Math.floor(Math.random() * deckCopy.length);
        hand.push(deckCopy.splice(index, 1)[0]);
      }
      opponents.push(hand);
    }
    return opponents;
  };

  if (boardCount === 5 && opponentCount === 1) {
    // Exhaustive enumeration
    const heroCategory = getHandCategory([...hero, ...board]);
    const heroScore = evaluateBoard(hero, board);
    for (let i = 0; i < deck.length - 1; i += 1) {
      for (let j = i + 1; j < deck.length; j += 1) {
        const oppScore = evaluateBoard([deck[i], deck[j]], board);
        if (heroScore > oppScore) result.wins += 1;
        else if (heroScore < oppScore) result.losses += 1;
        else result.ties += 1;
        result.total += 1;
      }
    }
    result.categoryCounts[heroCategory] = result.total;
  } else {
    // Monte Carlo simulation
    for (let i = 0; i < sampleRate; i += 1) {
      const remainingDeck = [...deck];
      const futureBoard: Card[] = [];
      const needed = 5 - boardCount;
      for (let k = 0; k < needed; k += 1) {
        const index = Math.floor(Math.random() * remainingDeck.length);
        futureBoard.push(remainingDeck.splice(index, 1)[0]);
      }
      const opponents = drawOpponents(remainingDeck);
      const heroFullBoard = [...hero, ...board, ...futureBoard];
      const heroScore = evaluateBoard(hero, [...board, ...futureBoard]);
      const heroCategory = getHandCategory(heroFullBoard);
      let oppBetter = false;
      let oppTie = false;
      for (const opponent of opponents) {
        const oppScore = evaluateBoard(opponent, [...board, ...futureBoard]);
        if (oppScore > heroScore) {
          oppBetter = true;
          break;
        }
        if (oppScore === heroScore) {
          oppTie = true;
        }
      }
      result.categoryCounts[heroCategory] += 1;
      if (oppBetter) result.losses += 1;
      else if (oppTie) result.ties += 1;
      else result.wins += 1;
      result.total += 1;
    }
  }

  result.winRate = result.total ? Number(((result.wins / result.total) * 100).toFixed(1)) : 0;
  result.tieRate = result.total ? Number(((result.ties / result.total) * 100).toFixed(1)) : 0;
  result.lossRate = result.total ? Number(((result.losses / result.total) * 100).toFixed(1)) : 0;

  if (result.total) {
    for (const category of Object.keys(result.categoryCounts)) {
      const key = Number(category);
      result.categoryProbabilities[key] = Number(
        ((result.categoryCounts[key] / result.total) * 100).toFixed(1)
      );
    }
  }

  return result;
};

self.onmessage = (ev: MessageEvent) => {
  try {
    const { hero, board, playerCount, sampleRate, reqId } = ev.data;
    const res = calculateResult(hero || [], board || [], playerCount || 2, sampleRate || sampleDefault);
    // post result back
    // @ts-ignore
    self.postMessage({ ok: true, result: res, reqId });
  } catch (err: any) {
    // @ts-ignore
    self.postMessage({ ok: false, error: err?.message || String(err), reqId });
  }
};
