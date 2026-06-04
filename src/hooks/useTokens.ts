import { useState, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// useTokens — per-agent per-day token usage tracker
//
// Stored in localStorage: `tokens:<agentId>:<YYYY-MM-DD>`
//   → { input: number, output: number, calls: number }
//
// Estimated cost (Sonnet 4 pricing):
//   Input:  $3 / 1M tokens  = $0.000003 per token
//   Output: $15 / 1M tokens = $0.000015 per token
// ─────────────────────────────────────────────────────────────────────────────

export interface TokenStats {
  input:  number;
  output: number;
  calls:  number;
}

const INPUT_COST_PER_TOKEN  = 3  / 1_000_000;   // $3 per 1M
const OUTPUT_COST_PER_TOKEN = 15 / 1_000_000;   // $15 per 1M

export function estimateCost(input: number, output: number): number {
  return input * INPUT_COST_PER_TOKEN + output * OUTPUT_COST_PER_TOKEN;
}

function todayKey(agentId: string) {
  const date = new Date().toISOString().split('T')[0];
  return `tokens:${agentId}:${date}`;
}

function loadStats(agentId: string): TokenStats {
  try {
    const raw = localStorage.getItem(todayKey(agentId));
    if (!raw) return { input: 0, output: 0, calls: 0 };
    return JSON.parse(raw) as TokenStats;
  } catch {
    return { input: 0, output: 0, calls: 0 };
  }
}

export function useTokens(agentId: string) {
  const [stats, setStats] = useState<TokenStats>(() => loadStats(agentId));

  const addUsage = useCallback((input: number, output: number) => {
    setStats(prev => {
      const next: TokenStats = {
        input:  prev.input  + input,
        output: prev.output + output,
        calls:  prev.calls  + 1,
      };
      try {
        localStorage.setItem(todayKey(agentId), JSON.stringify(next));
      } catch { /* quota exceeded — ignore */ }
      return next;
    });
  }, [agentId]);

  const totalTokens = stats.input + stats.output;
  const estimatedUSD = estimateCost(stats.input, stats.output);

  return { stats, addUsage, totalTokens, estimatedUSD };
}

/** Get all-time total across all agents for the given date (default: today) */
export function getDayTotals(date?: string): TokenStats & { agentBreakdown: Record<string, TokenStats> } {
  const d = date ?? new Date().toISOString().split('T')[0];
  const agentBreakdown: Record<string, TokenStats> = {};
  let total: TokenStats = { input: 0, output: 0, calls: 0 };

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith('tokens:')) continue;
    const parts = key.split(':');
    if (parts.length < 3 || parts[2] !== d) continue;
    const agentId = parts[1];
    try {
      const s = JSON.parse(localStorage.getItem(key)!) as TokenStats;
      agentBreakdown[agentId] = s;
      total = { input: total.input + s.input, output: total.output + s.output, calls: total.calls + s.calls };
    } catch { /* skip */ }
  }

  return { ...total, agentBreakdown };
}
