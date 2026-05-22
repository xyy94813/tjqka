import { useMemo, useState } from 'react';

type Card = { rank: number; suit: string; code: string };

type Result = {
  wins: number;
  ties: number;
  losses: number;
  total: number;
  winRate: number;
  tieRate: number;
  lossRate: number;
  categoryCounts: Record<number, number>;
  categoryProbabilities: Record<number, number>;
};

type CardInput = { rank: string; suit: string };

const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
const suits = ['h', 'd', 'c', 's'];
const suitLabels: Record<string, string> = { h: '♥️', d: '♦️', c: '♣️', s: '♠️' };
const rankValue: Record<string, number> = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, T: 10, J: 11, Q: 12, K: 13, A: 14 };
const handCategoryNames = ['高牌', '一对', '两对', '三条', '顺子', '同花', '葫芦', '四条', '同花顺'];

const cardLabels = ['手牌 1', '手牌 2', 'Flop 1', 'Flop 2', 'Flop 3', 'Turn', 'River'];
const openHighWinRateHands = [
  { hand: 'AA', rate: 85.2 },
  { hand: 'KK', rate: 82.1 },
  { hand: 'QQ', rate: 79.8 },
  { hand: 'JJ', rate: 77.6 },
  { hand: 'TT', rate: 75.2 },
  { hand: '99', rate: 72.9 },
  { hand: '88', rate: 70.7 },
  { hand: 'AKs', rate: 67.5 },
  { hand: 'AQs', rate: 66.1 },
  { hand: 'AJs', rate: 64.2 },
  { hand: 'KQs', rate: 63.0 },
  { hand: 'ATs', rate: 61.4 },
  { hand: 'KJs', rate: 60.0 },
  { hand: 'QJs', rate: 58.6 },
  { hand: 'AJo', rate: 58.6 },
  { hand: 'KQo', rate: 56.6 },
];
const pocketPairWinRates = [
  { hand: '77', rate: 67.9 },
  { hand: '66', rate: 65.2 },
  { hand: '55', rate: 62.5 },
  { hand: '44', rate: 59.9 },
  { hand: '33', rate: 57.5 },
  { hand: '22', rate: 55.6 },
];

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

const buildCard = (rank: string, suit: string): Card | null => {
  let normalizedRank = rank.trim().toUpperCase();
  const normalizedSuit = suit.trim().toLowerCase();
  if (!normalizedRank || !normalizedSuit) return null;
  if (normalizedRank === '10') normalizedRank = 'T';
  const code = `${normalizedRank}${normalizedSuit}`;
  if (!rankValue[normalizedRank] || !suits.includes(normalizedSuit)) return null;
  return { rank: rankValue[normalizedRank], suit: normalizedSuit, code };
};

const getHandCategory = (cards: Card[]) => {
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
        return allRanks[i];
      }
    }
    return 0;
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

const sampleRate = 2000;

const calculateResult = (hero: Card[], board: Card[]): Result => {
  const used = [...hero, ...board];
  const deck = buildDeck(used);
  const boardCount = board.length;
  const result: Result = {
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

  const evaluateBoard = (heroCards: Card[], boardCards: Card[]) => {
    return scoreBestHand([...heroCards, ...boardCards]);
  };

  if (boardCount === 5) {
    const heroCategory = getHandCategory([...hero, ...board]);
    for (let i = 0; i < deck.length - 1; i += 1) {
      for (let j = i + 1; j < deck.length; j += 1) {
        const opp = [deck[i], deck[j]];
        const heroScore = evaluateBoard(hero, board);
        const oppScore = evaluateBoard(opp, board);
        if (heroScore > oppScore) result.wins += 1;
        else if (heroScore < oppScore) result.losses += 1;
        else result.ties += 1;
        result.total += 1;
      }
    }
    result.categoryCounts[heroCategory] = result.total;
  } else {
    for (let i = 0; i < sampleRate; i += 1) {
      const remainingDeck = [...deck];
      const futureBoard: Card[] = [];
      const needed = 5 - boardCount;
      for (let k = 0; k < needed; k += 1) {
        const index = Math.floor(Math.random() * remainingDeck.length);
        futureBoard.push(remainingDeck.splice(index, 1)[0]);
      }
      const opponent: Card[] = [];
      for (let k = 0; k < 2; k += 1) {
        const index = Math.floor(Math.random() * remainingDeck.length);
        opponent.push(remainingDeck.splice(index, 1)[0]);
      }
      const heroScore = evaluateBoard(hero, [...board, ...futureBoard]);
      const oppScore = evaluateBoard(opponent, [...board, ...futureBoard]);
      const heroCategory = getHandCategory([...hero, ...board, ...futureBoard]);
      result.categoryCounts[heroCategory] += 1;
      if (heroScore > oppScore) result.wins += 1;
      else if (heroScore < oppScore) result.losses += 1;
      else result.ties += 1;
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

const App = () => {
  const [heroInput, setHeroInput] = useState<CardInput[]>([
    { rank: 'A', suit: 'h' },
    { rank: 'K', suit: 'd' },
  ]);
  const [boardInput, setBoardInput] = useState<CardInput[]>(
    Array.from({ length: 5 }, () => ({ rank: '', suit: '' }))
  );

  const heroCards = heroInput.map((card) => buildCard(card.rank, card.suit));
  const boardCards = boardInput.map((card) => buildCard(card.rank, card.suit));
  const heroValid = heroCards.every((card) => card !== null);
  const boardValid = boardInput.every((card) => (!card.rank && !card.suit) || (card.rank && card.suit));
  const hasPartialBoard = boardInput.some((card) => (card.rank && !card.suit) || (!card.rank && card.suit));
  const usedCards = [...heroCards.filter(Boolean) as Card[], ...boardCards.filter(Boolean) as Card[]];
  const hasDuplicates = usedCards.length !== new Set(usedCards.map((card) => card.code)).size;
  const inputValid = heroValid && boardValid && !hasDuplicates;

  const result = useMemo(() => {
    if (!inputValid) return null;
    return calculateResult(heroCards as Card[], boardCards.filter(Boolean) as Card[]);
  }, [heroInput, boardInput]);

  const strategy = result
    ? result.winRate >= 65
      ? '建议主动进攻：适合继续加注或跟注。'
      : result.winRate >= 45
      ? '建议保守观察：可以继续，但注意对手动作。'
      : '建议收手：当前胜率偏低，谨慎弃牌或最小化投入。'
    : '';

  const updateHero = (index: number, field: keyof CardInput, value: string) => {
    const next = [...heroInput];
    next[index] = { ...next[index], [field]: value };
    setHeroInput(next);
  };

  const updateBoard = (index: number, field: keyof CardInput, value: string) => {
    const next = [...boardInput];
    next[index] = { ...next[index], [field]: value };
    setBoardInput(next);
  };

  const resetAll = () => {
    setHeroInput([
      { rank: 'A', suit: 'h' },
      { rank: 'K', suit: 'd' },
    ]);
    setBoardInput(Array.from({ length: 5 }, () => ({ rank: '', suit: '' })));
  };

  const invalidMessage = hasDuplicates
    ? '检测到重复牌，请检查输入。'
    : hasPartialBoard
    ? '公共牌请选择完整的花色与牌面，或保留为空。'
    : !heroValid
    ? '请先选择两张手牌。'
    : '';

  return (
    <div className="app-shell">
      <header>
        <h1>德州扑克胜率计算器</h1>
        <p>先选择花色，再选择牌面，实时计算胜率。</p>
      </header>

      <div className="main-layout">
        <section className="high-hands-panel">
          <h2>高胜率</h2>
          <ul>
            {openHighWinRateHands.map(({ hand, rate }) => (
              <li key={hand}>
                {hand}: {rate}%
              </li>
            ))}
            {pocketPairWinRates.map(({ hand, rate }) => (
              <li key={hand}>
                {hand}: {rate}%
              </li>
            ))}
          </ul>
        </section>

        <section className="card-inputs">
          <div className="input-group">
            <h2>手牌</h2>
            <div className="card-grid">
              {heroInput.map((card, index) => (
                <label key={index}>
                  {cardLabels[index]}
                  <div className="card-selects">
                    <div className="suit-options">
                      {suits.map((suit) => (
                        <label key={suit} className="suit-option">
                          <input
                            type="radio"
                            name={`hero-suit-${index}`}
                            value={suit}
                            checked={card.suit === suit}
                            onChange={(event) => updateHero(index, 'suit', event.target.value)}
                          />
                          {suitLabels[suit]}
                        </label>
                      ))}
                    </div>
                    <input
                      value={card.rank}
                      onChange={(event) => updateHero(index, 'rank', event.target.value)}
                      placeholder="输入牌号，例如 10 或 A"
                      maxLength={2}
                    />
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="input-group">
            <h2>公共牌</h2>
            <div className="board-group">
              <div>
                <h3>Flop</h3>
                <div className="card-grid">
                  {boardInput.slice(0, 3).map((card, index) => (
                    <label key={index}>
                      {cardLabels[index + 2]}
                      <div className="card-selects">
                        <div className="suit-options">
                          {suits.map((suit) => (
                            <label key={suit} className="suit-option">
                              <input
                                type="radio"
                                name={`board-suit-${index}`}
                                value={suit}
                                checked={card.suit === suit}
                                onChange={(event) => updateBoard(index, 'suit', event.target.value)}
                              />
                              {suitLabels[suit]}
                            </label>
                          ))}
                        </div>
                        <input
                          value={card.rank}
                          onChange={(event) => updateBoard(index, 'rank', event.target.value)}
                          placeholder="输入牌号，例如 10 或 A"
                          maxLength={2}
                        />
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3>Turn / River</h3>
                <div className="card-grid">
                  {boardInput.slice(3).map((card, index) => (
                    <label key={index + 3}>
                      {cardLabels[index + 5]}
                      <div className="card-selects">
                        <div className="suit-options">
                          {suits.map((suit) => (
                            <label key={suit} className="suit-option">
                              <input
                                type="radio"
                                name={`board-suit-${index + 3}`}
                                value={suit}
                                checked={card.suit === suit}
                                onChange={(event) => updateBoard(index + 3, 'suit', event.target.value)}
                              />
                              {suitLabels[suit]}
                            </label>
                          ))}
                        </div>
                        <input
                          value={card.rank}
                          onChange={(event) => updateBoard(index + 3, 'rank', event.target.value)}
                          placeholder="输入牌号，例如 10 或 A"
                          maxLength={2}
                        />
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="actions">
            <button type="button" onClick={resetAll}>重置</button>
          </div>

          <div className="hints">
            <p>先选择花色，再输入牌号。10 可直接输入“10”，其余牌号为 A/K/Q/J/T/2-9。</p>
            {invalidMessage && <p className="error">{invalidMessage}</p>}
          </div>
        </section>

        <section className="result-panel">
          <h2>计算结果</h2>
          {inputValid && result ? (
            <div className="result-grid">
              <div className="metric">
                <span className="label">胜率</span>
                <strong>{result.winRate}%</strong>
              </div>
              <div className="metric">
                <span className="label">平局率</span>
                <strong>{result.tieRate}%</strong>
              </div>
              <div className="metric">
                <span className="label">失败率</span>
                <strong>{result.lossRate}%</strong>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <p>请先选择两张手牌，并确保公共牌无重复。系统将自动计算胜率。</p>
            </div>
          )}

          {result && (
            <div className="category-panel">
              <h3>各牌型概率</h3>
              <ul>
                {Object.entries(result.categoryProbabilities)
                  .filter(([, value]) => value > 0)
                  .map(([category, value]) => (
                    <li key={category}>
                      {handCategoryNames[Number(category)]}: {value}%
                    </li>
                  ))}
              </ul>
            </div>
          )}
          {result && (
            <div className="strategy-panel">
              <h3>推荐策略</h3>
              <p>{strategy}</p>
              <ul>
                <li>当前胜率：{result.winRate}%</li>
                <li>平局概率：{result.tieRate}%</li>
                <li>失败概率：{result.lossRate}%</li>
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default App;
