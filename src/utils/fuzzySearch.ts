/**
 * Fuzzy Search Utilities
 * Provides fuzzy matching capabilities for tolerating typos in search queries
 */

/**
 * Calculate Levenshtein distance between two strings
 * Lower distance = more similar strings
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = [];

  for (let i = 0; i <= m; i++) {
    dp[i] = [i];
  }

  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,    // deletion
          dp[i][j - 1] + 1,    // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Check if two strings are similar enough based on fuzzy matching
 * @param query The search query (potentially with typos)
 * @param target The target string to match against
 * @param threshold Maximum allowed distance (default: 2 for minor typos)
 * @returns true if strings are similar enough
 */
export function fuzzyMatch(query: string, target: string, threshold: number = 2): boolean {
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase().trim();

  // Exact match
  if (q === t) return true;

  // Contains match
  if (t.includes(q) || q.includes(t)) return true;

  // Fuzzy match with Levenshtein distance
  const distance = levenshteinDistance(q, t);
  const maxLength = Math.max(q.length, t.length);

  // Allow more tolerance for longer strings
  const dynamicThreshold = Math.min(threshold, Math.floor(maxLength * 0.25));

  return distance <= dynamicThreshold;
}

/**
 * Fuzzy search through an array of strings
 * @param query The search query
 * @param items Array of strings to search through
 * @param threshold Fuzzy matching threshold
 * @returns Matching items sorted by relevance
 */
export function fuzzySearch(
  query: string,
  items: string[],
  threshold: number = 2
): { item: string; distance: number }[] {
  const results: { item: string; distance: number }[] = [];
  const q = query.toLowerCase().trim();

  for (const item of items) {
    const t = item.toLowerCase().trim();

    // Exact match gets highest priority (distance 0)
    if (t === q) {
      results.push({ item, distance: 0 });
      continue;
    }

    // Contains match gets second priority (distance 0.5)
    if (t.includes(q)) {
      results.push({ item, distance: 0.5 });
      continue;
    }

    // Fuzzy match
    const distance = levenshteinDistance(q, t);
    const maxLength = Math.max(q.length, t.length);
    const dynamicThreshold = Math.min(threshold, Math.floor(maxLength * 0.25));

    if (distance <= dynamicThreshold) {
      results.push({ item, distance });
    }
  }

  // Sort by distance (lower is better)
  return results.sort((a, b) => a.distance - b.distance);
}

/**
 * Enhanced search that tries to find common typos and suggest corrections
 * @param query The original query
 * @returns Possible corrections for common typos
 */
export function getSuggestedCorrections(query: string): string[] {
  const corrections: string[] = [];
  const q = query.toLowerCase();

  // Common typo patterns for Portuguese technical terms
  const commonCorrections: Record<string, string[]> = {
    'aferecimento': ['arrefecimento'],
    'arrefescimento': ['arrefecimento'],
    'manutenssao': ['manutenção'],
    'manutencao': ['manutenção'],
    'manutensao': ['manutenção'],
    'preventivo': ['preventiva'],
    'corretivo': ['corretiva'],
    'emergeencial': ['emergencial'],
    'emerencial': ['emergencial'],
    'tecnico': ['técnico'],
    'mecanico': ['mecânico'],
    'eletrico': ['elétrico'],
    'hidraulico': ['hidráulico'],
    'pneumatico': ['pneumático'],
    'valvula': ['válvula'],
    'compressosr': ['compressor'],
    'compresor': ['compressor'],
    'gerrador': ['gerador'],
    'gerdor': ['gerador'],
    'lubrifcacao': ['lubrificação'],
    'lubricacao': ['lubrificação'],
    'refrigeracao': ['refrigeração'],
    'refrijeracao': ['refrigeração'],
    'sistena': ['sistema'],
    'sisitema': ['sistema']
  };

  // Check for direct corrections
  if (commonCorrections[q]) {
    corrections.push(...commonCorrections[q]);
  }

  // Check each word in multi-word queries
  const words = q.split(/\s+/);
  const correctedWords = words.map(word => {
    if (commonCorrections[word]) {
      return commonCorrections[word][0];
    }
    return word;
  });

  // If any word was corrected, add the full corrected phrase
  if (correctedWords.join(' ') !== q) {
    corrections.push(correctedWords.join(' '));
  }

  return corrections;
}

/**
 * Prepare search query with fuzzy matching enhancements
 * @param originalQuery The original search query
 * @param contextText The text to search within
 * @returns Enhanced query with possible corrections
 */
export function prepareEnhancedSearchQuery(
  originalQuery: string,
  contextText: string
): {
  originalQuery: string;
  suggestions: string[];
  matchedTerms: string[];
} {
  const suggestions = getSuggestedCorrections(originalQuery);
  const matchedTerms: string[] = [];

  // Extract key terms from context for fuzzy matching
  const contextWords = contextText
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 4); // Only consider words with 5+ characters

  // Try to find fuzzy matches in context
  const queryWords = originalQuery.toLowerCase().split(/\s+/);

  for (const queryWord of queryWords) {
    const matches = fuzzySearch(queryWord, contextWords, 2);
    if (matches.length > 0 && matches[0].distance > 0) {
      // Found a fuzzy match that's not exact
      matchedTerms.push(matches[0].item);
    }
  }

  return {
    originalQuery,
    suggestions,
    matchedTerms
  };
}