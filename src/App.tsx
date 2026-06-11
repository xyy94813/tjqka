import { useEffect, useRef, useState } from 'react';
import useDebounce from './hooks/useDebounce';

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
//   { hand: 'AA', rate: 85.2 },
//   { hand: 'KK', rate: 82.1 },
//   { hand: 'QQ', rate: 79.8 },
//   { hand: 'JJ', rate: 77.6 },
//   { hand: 'TT', rate: 75.2 },
//   { hand: '99', rate: 72.9 },
//   { hand: '88', rate: 70.7 },
  { hand: '77', rate: 67.9 },
  { hand: '66', rate: 65.2 },
  { hand: '55', rate: 62.5 },
  { hand: '44', rate: 59.9 },
  { hand: '33', rate: 57.5 },
  { hand: '22', rate: 55.6 },
];

const adjustOpenRate = (baseRate: number, playerCount: number) => {
  if (playerCount < 2) return null;
  const adjusted = Math.pow(baseRate / 100, playerCount - 1) * 100;
  return Number(adjusted.toFixed(1));
};

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

const calculateResult = (hero: Card[], board: Card[], playerCount: number): Result => {
  const used = [...hero, ...board];
  const deck = buildDeck(used);
  const boardCount = board.length;
  const opponentCount = Math.max(1, playerCount - 1);
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

const App = () => {
  const [selectedCards, setSelectedCards] = useState<CardInput[]>(Array.from({ length: 7 }, () => ({ rank: '', suit: '' })));
  const [playerCount, setPlayerCount] = useState(4);

  const heroCardsIn = selectedCards.slice(0, 2);
  const boardCardsIn = selectedCards.slice(2);
  const heroCards = heroCardsIn.map(c => buildCard(c.rank, c.suit)).filter(Boolean) as Card[];
  const boardCards = boardCardsIn.map(c => buildCard(c.rank, c.suit)).filter(Boolean) as Card[];
  const heroValid = heroCards.length === 2;
  const hasPartialBoard = selectedCards.length > 2 && selectedCards.slice(2).some(c => !c.rank);
  const usedCards = [...heroCards, ...boardCards];
  const hasDuplicates = usedCards.length !== new Set(usedCards.map((card) => card.code)).size;
  const validPlayerCount = Number.isInteger(playerCount) && playerCount >= 2 && playerCount <= 9;
  const inputValid = heroValid && !hasDuplicates && validPlayerCount;

  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  const debouncedSelected = useDebounce(selectedCards, 250);
  const debouncedPlayerCount = useDebounce(playerCount, 250);

  useEffect(() => {
    // create worker once
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    workerRef.current = new Worker(new URL('./worker/simWorker.ts', import.meta.url));
    const w = workerRef.current;
    w.onmessage = (ev: MessageEvent) => {
      const data = ev.data;
      if (data && data.ok) {
        setResult(data.result);
      }
      setLoading(false);
    };
    w.onerror = () => {
      setLoading(false);
    };
    return () => {
      w.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const heroCardsToSend = debouncedSelected.slice(0, 2).map((c) => buildCard(c.rank, c.suit)).filter(Boolean) as Card[];
    const boardCardsToSend = debouncedSelected.slice(2).map((c) => buildCard(c.rank, c.suit)).filter(Boolean) as Card[];
    const valid = heroCardsToSend.length === 2 && Number.isInteger(debouncedPlayerCount) && debouncedPlayerCount >= 2 && debouncedPlayerCount <= 9;
    if (!valid) {
      setResult(null);
      setLoading(false);
      return;
    }

    if (workerRef.current) {
      setLoading(true);
      workerRef.current.postMessage({ hero: heroCardsToSend, board: boardCardsToSend, playerCount: debouncedPlayerCount, sampleRate: 2000 });
    } else {
      // fallback to synchronous (rare)
      setLoading(true);
      setTimeout(() => {
        try {
          const res = calculateResult(heroCardsToSend, boardCardsToSend, debouncedPlayerCount);
          setResult(res);
        } catch (e) {
          setResult(null);
        } finally {
          setLoading(false);
        }
      }, 0);
    }
  }, [debouncedSelected, debouncedPlayerCount]);

  const strategy = result
    ? result.winRate >= 65
      ? '建议主动进攻：适合继续加注或跟注。'
      : result.winRate >= 45
      ? '建议保守观察：可以继续，但注意对手动作。'
      : '建议收手：当前胜率偏低，谨慎弃牌或最小化投入。'
    : '';

  const addCard = (rank: string, suit: string) => {
    if (selectedCards.filter((c) => c && c.rank).length >= 7) return;
    const already = selectedCards.some(c => c.rank === rank && c.suit === suit);
    if (already) return;
    const newSelected = [...selectedCards];
    const idx = selectedCards.findIndex(c => !c?.rank);
    if (idx !== -1) {
      newSelected[idx] = { rank, suit };
    } else {
      newSelected.push({ rank, suit });
    }
    setSelectedCards(newSelected)
  };

  const removeCard = (idx: number) => {
    setSelectedCards((selected) => {
      selected[idx] = { rank: '', suit: '' };
      return [...selected]
    });
  };

  const resetAll = () => {
    setSelectedCards(Array.from({ length: 7 }, () => ({ rank: '', suit: '' })));
  };

  const invalidMessage = playerCount < 2
    ? '请先输入 2-9 人的牌桌人数。'
    : hasDuplicates
    ? '检测到重复牌，请检查输入。'
    : selectedCards.length < 2
    ? '请先至少选择两张手牌。'
    : '';

  const combinedHands = (() => {
    const combined = [...openHighWinRateHands, ...pocketPairWinRates];
    const map = new Map<string, { hand: string; rate: number }>();
    for (const item of combined) {
      if (!map.has(item.hand)) map.set(item.hand, item);
    }
    return Array.from(map.values());
  })();

  return (
    <div className="app-shell">
      <header>
        <h1>德州扑克胜率计算器</h1>
        <p>先选择花色，再选择牌面，实时计算胜率。</p>
      </header>

      <div className="main-layout">
        <section className="player-count-panel">
          <label htmlFor="player-count">桌上人数</label>
          <select
            id="player-count"
            className="player-count-input"
            value={playerCount}
            onChange={(e) => setPlayerCount(Number(e.target.value))}
          >
            {Array.from({ length: 8 }, (_, index) => index + 2).map((count) => (
              <option key={count} value={count}>{count} 人</option>
            ))}
          </select>
        </section>

        <section className="high-hands-panel">
          <h2>参考牌型</h2>
          <ul>
            {combinedHands.map(({ hand, rate }) => {
              const adjusted = adjustOpenRate(rate, playerCount);
              return (
                <li key={hand}>
                  {hand}: {adjusted !== null ? `${adjusted}%` : '请输入人数'}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card-inputs">
          {/* 手牌 - selected hero cards (first 2) */}
          <div className="hero-section">
            <h3>手牌</h3>
            <div className="selected-cards">
              {selectedCards.slice(0, 2).length > 0
                ? selectedCards.slice(0, 2).map((card, i) => (
                    <div key={i} className="selected-card-item">
                      <span className="selected-card-text">{suitLabels[card.suit]}{card.rank}</span>
                      <button className="remove-btn" onClick={() => removeCard(i)}>×</button>
                    </div>
                  ))
                : <div className="selected-card-item empty">空</div>
              }
            </div>
          </div>

          {/* 公共牌 - selected board cards (index 2+) */}
          <div className="board-section">
            <h3>公共牌</h3>
            <div className="selected-cards">
              {selectedCards.slice(2).length > 0
                ? selectedCards.slice(2).map((card, i) => (
                    <div key={i} className="selected-card-item">
                      <span className="selected-card-text">{suitLabels[card.suit]}{card.rank}</span>
                      <button className="remove-btn" onClick={() => removeCard(i + 2)}>×</button>
                    </div>
                  ))
                : <div className="selected-card-item empty">空</div>
              }
            </div>
          </div>

          {/* 所有牌 - clickable grid of all 52 cards, one row per suit */}
          <div className="all-cards-section">
            <h3>所有牌</h3>
            {suits.map((suit) => (
              <div key={suit} className="suit-row">
                <span className="suit-row-label">{suitLabels[suit]}</span>
                <div className="all-cards-grid">
                  {ranks.map((rank) => {
                    const selected = selectedCards.some(
                      (c) => c.rank === rank && c.suit === suit
                    );
                    return (
                      <button
                        key={`${rank}${suit}`}
                        type="button"
                        className={`all-card-btn${selected ? ' selected' : ''}`}
                        onClick={() => addCard(rank, suit)}
                        disabled={selected}
                      >
                        {rank}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="actions">
            <button type="button" onClick={resetAll}>重置</button>
          </div>

          <div className="hints">
            <p>点击「所有牌」中的牌，依次填入「手牌」与「公共牌」。已选中的牌不可重复点击。</p>
            {invalidMessage && <p className="error">{invalidMessage}</p>}
            {hasPartialBoard && !invalidMessage && (
              <p>注意：部分公共牌未填写，计算时会自动忽略无效条目。</p>
            )}
          </div>
        </section>

        <section className="result-panel">
          <h2>计算结果</h2>
          {!inputValid && (
            <div className="empty-state">
              <p>请先输入牌桌人数、选择两张手牌，并确保公共牌无重复。系统将自动计算胜率。</p>
            </div>
          )}

          {inputValid && loading && (
            <div className="empty-state"><p>计算中，请稍候…</p></div>
          )}

          {inputValid && !loading && result && (
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
          )}

          {inputValid && !loading && !result && (
            <div className="empty-state">
              <p>请先输入牌桌人数、选择两张手牌，并确保公共牌无重复。系统将自动计算胜率。</p>
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
