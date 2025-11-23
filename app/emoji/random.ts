// Utilities for random emoji selection used by the Emoji page.

import { EMOJI_PRESENTATION_CODEPOINTS } from "./emoji_presentation_codepoints";

export function generateRandomEmojiSet(count: number): number[][] {
    const available = EMOJI_PRESENTATION_CODEPOINTS;
    if (available.length === 0) return [[0x1f600]];

    // Clamp to available unique emojis to avoid infinite loops
    const take = Math.max(0, Math.min(count, available.length));

    // Create a shallow copy and do a partial Fisher–Yates shuffle up to `take`
    const pool = available.slice();
    for (let i = 0; i < take; i++) {
        const j = i + Math.floor(Math.random() * (pool.length - i));
        const tmp = pool[i];
        pool[i] = pool[j]!;
        pool[j] = tmp!;
    }

    return pool.slice(0, take).map((cp) => [cp]);
}


