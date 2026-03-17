export interface UsageStats {
  totalRequests: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedTotalTokens: number;
  estimatedCost: number; // in USD
  lastUpdated: string;
}

const GPT4O_MINI_RATES = {
  inputPerMillion: 0.15, // $0.15 per 1M input tokens
  outputPerMillion: 0.6, // $0.60 per 1M output tokens
};

// Rough token estimation: ~4 chars = 1 token (for English)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function createUsageTracker(): {
  addRequest: (query: string, responseText: string) => UsageStats;
  getStats: () => UsageStats;
  reset: () => void;
} {
  let stats: UsageStats = {
    totalRequests: 0,
    estimatedInputTokens: 0,
    estimatedOutputTokens: 0,
    estimatedTotalTokens: 0,
    estimatedCost: 0,
    lastUpdated: new Date().toISOString(),
  };

  const addRequest = (query: string, responseText: string): UsageStats => {
    const inputTokens = estimateTokens(query);
    const outputTokens = estimateTokens(responseText);

    stats.totalRequests += 1;
    stats.estimatedInputTokens += inputTokens;
    stats.estimatedOutputTokens += outputTokens;
    stats.estimatedTotalTokens += inputTokens + outputTokens;

    // Calculate cost
    const inputCost = (stats.estimatedInputTokens / 1_000_000) * GPT4O_MINI_RATES.inputPerMillion;
    const outputCost = (stats.estimatedOutputTokens / 1_000_000) * GPT4O_MINI_RATES.outputPerMillion;
    stats.estimatedCost = inputCost + outputCost;

    stats.lastUpdated = new Date().toISOString();

    return { ...stats };
  };

  const getStats = (): UsageStats => ({ ...stats });

  const reset = (): void => {
    stats = {
      totalRequests: 0,
      estimatedInputTokens: 0,
      estimatedOutputTokens: 0,
      estimatedTotalTokens: 0,
      estimatedCost: 0,
      lastUpdated: new Date().toISOString(),
    };
  };

  return { addRequest, getStats, reset };
}

// Global singleton tracker
export const globalUsageTracker = createUsageTracker();
