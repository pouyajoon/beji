"use client";

import { useMemo, useState } from "react";

type ArtworkSet = "twemoji" | "noto" | "fluent3d";

const SKIN_TONES = [
    { label: "Default", codepoint: null },
    { label: "Light", codepoint: 0x1f3fb },
    { label: "Medium-Light", codepoint: 0x1f3fc },
    { label: "Medium", codepoint: 0x1f3fd },
    { label: "Medium-Dark", codepoint: 0x1f3fe },
    { label: "Dark", codepoint: 0x1f3ff },
] as const;

const ZWJ = 0x200d;
const VS16 = 0xfe0f;

function hexToCodepoints(hex: string): number[] | null {
    const trimmed = hex.trim().toLowerCase();
    if (!trimmed) return null;
    const parts = trimmed
        .replace(/^u\+?/g, "")
        .replace(/^0x/g, "")
        .split(/[\s,_-]+/);
    const cps: number[] = [];
    for (const part of parts) {
        const p = part.replace(/^u\+?/g, "");
        const n = Number.parseInt(p, 16);
        if (Number.isNaN(n)) return null;
        cps.push(n);
    }
    return cps.length ? cps : null;
}

function codepointsToHyphenHex(cps: number[]): string {
    return cps.map((cp) => cp.toString(16)).join("-");
}

function normalizeForFilenames(cps: number[]): number[] {
    // Most art sets do not require VS16 explicitly in filenames; drop it unless set requires it
    return cps.filter((cp) => cp !== VS16);
}

function applySkinTone(base: number[], tone: number | null): number[] {
    if (!tone) return base;

    // Simple heuristic: insert tone after first human base if present
    // Human bases commonly in ranges: 0x1F466..0x1F469, 0x1F471.., and person/hand emojis varies.
    // For MVP: if sequence includes ZWJ, attach tone to first segment before ZWJ; else after first codepoint.
    const zwjIndex = base.indexOf(ZWJ);
    if (zwjIndex > 0) {
        const head = base.slice(0, zwjIndex);
        const tail = base.slice(zwjIndex);
        // Avoid duplicating an existing tone
        const headNoTone = head.filter((cp) => cp < 0x1f3fb || cp > 0x1f3ff);
        const toneValue = tone as number;
        return [...headNoTone, toneValue, ...tail];
    }
    // No ZWJ: attach after first codepoint, replacing existing tone if found
    const withoutExistingTone = base.filter((cp) => cp < 0x1f3fb || cp > 0x1f3ff);
    const toneValue = tone as number;
    if (withoutExistingTone.length === 0) return [toneValue];
    const [first, ...rest] = withoutExistingTone;
    return [first as number, toneValue, ...rest];
}

function twemojiUrl(cps: number[]): string {
    // Uses jsDelivr pointing to twemoji v14.0.2
    const seq = codepointsToHyphenHex(normalizeForFilenames(cps));
    return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${seq}.svg`;
}

function notoUrl(cps: number[]): string {
    const seq = normalizeForFilenames(cps)
        .map((cp) => cp.toString(16))
        .join("_");
    return `https://raw.githubusercontent.com/googlefonts/noto-emoji/main/svg/emoji_u${seq}.svg`;
}

function fluentNote(): string {
    return "Fluent 3D mapping requires a name index; not resolved in MVP.";
}

function codepointsToEmoji(cps: number[]): string {
    return String.fromCodePoint(...cps);
}

const BASIC_GRID: number[][] = [
    [0x1f600], // 😀
    [0x1f603], // 😃
    [0x1f604], // 😄
    [0x1f601], // 😁
    [0x1f602], // 😂
    [0x1f605], // 😅
    [0x1f606], // 😆
    [0x1f923], // 🤣
    [0x1f642], // 🙂
    [0x1f60a], // 😊
    [0x1f60d], // 😍
    [0x1f609], // 😉
    [0x1f44d], // 👍
    [0x1f44e], // 👎
    [0x1f44f], // 👏
    [0x270a, VS16], // ✊
    [0x270b, VS16], // ✋
    [0x1f64f], // 🙏
    [0x1f468, ZWJ, 0x1f4bb], // 👨‍💻
    [0x1f469, ZWJ, 0x1f4bb], // 👩‍💻
];

export default function EmojiPage() {
    const [activeTab, setActiveTab] = useState<"grid" | "code">("grid");
    const [codeInput, setCodeInput] = useState("1f600");
    const [selected, setSelected] = useState<number[] | null>([0x1f600]);
    const [skin, setSkin] = useState<number | null>(null);
    const [artSet, setArtSet] = useState<ArtworkSet>("twemoji");

    const effectiveSequence = useMemo(() => {
        if (!selected) return null;
        return applySkinTone(selected, skin);
    }, [selected, skin]);

    const artUrl = useMemo(() => {
        if (!effectiveSequence) return "";
        switch (artSet) {
            case "twemoji":
                return twemojiUrl(effectiveSequence);
            case "noto":
                return notoUrl(effectiveSequence);
            case "fluent3d":
                return ""; // not mapped in MVP
            default:
                return "";
        }
    }, [effectiveSequence, artSet]);

    const handleParse = () => {
        const cps = hexToCodepoints(codeInput);
        if (cps && cps.length) setSelected(cps);
    };

    return (
        <div style={{ background: "#fff", color: "#000", padding: 16 }}>
            <h2 style={{ fontWeight: 600, marginBottom: 12 }}>Emoji Selector (MVP)</h2>

            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <button
                    onClick={() => setActiveTab("grid")}
                    style={{
                        padding: "6px 10px",
                        border: "1px solid #e5e7eb",
                        background: activeTab === "grid" ? "#f3f4f6" : "#fff",
                        cursor: "pointer",
                    }}
                >
                    Font Grid
                </button>
                <button
                    onClick={() => setActiveTab("code")}
                    style={{
                        padding: "6px 10px",
                        border: "1px solid #e5e7eb",
                        background: activeTab === "code" ? "#f3f4f6" : "#fff",
                        cursor: "pointer",
                    }}
                >
                    Code Input
                </button>
            </div>

            {
                activeTab === "grid" ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 40px)", gap: 8, marginBottom: 16 }}>
                        {BASIC_GRID.map((cps, idx) => (
                            <button
                                key={idx}
                                onClick={() => setSelected(cps)}
                                style={{
                                    width: 40,
                                    height: 40,
                                    border: "1px solid #e5e7eb",
                                    background: "#fff",
                                    cursor: "pointer",
                                    fontSize: 24,
                                }}
                                aria-label={codepointsToHyphenHex(cps)}
                                title={codepointsToHyphenHex(cps)}
                            >
                                {codepointsToEmoji(cps)}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                        <input
                            value={codeInput}
                            onChange={(e) => setCodeInput(e.target.value)}
                            placeholder="e.g. 1f469-1f3fd-200d-1f4bb"
                            style={{
                                flex: 1,
                                border: "1px solid #e5e7eb",
                                padding: "6px 10px",
                            }}
                        />
                        <button
                            onClick={handleParse}
                            style={{
                                padding: "6px 10px",
                                border: "1px solid #e5e7eb",
                                background: "#f9fafb",
                                cursor: "pointer",
                            }}
                        >
                            Select
                        </button>
                    </div>
                )
            }

            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
                <div>
                    <label style={{ fontSize: 12, color: "#6b7280" }}>Skin tone</label>
                    <select
                        value={skin ?? ""}
                        onChange={(e) => setSkin(e.target.value ? Number(e.target.value) : null)}
                        style={{ display: "block", border: "1px solid #e5e7eb", padding: 6 }}
                    >
                        {SKIN_TONES.map((t) => (
                            <option key={t.label} value={t.codepoint ?? ""}>
                                {t.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label style={{ fontSize: 12, color: "#6b7280" }}>Artwork set</label>
                    <select
                        value={artSet}
                        onChange={(e) => setArtSet(e.target.value as ArtworkSet)}
                        style={{ display: "block", border: "1px solid #e5e7eb", padding: 6 }}
                    >
                        <option value="twemoji">Twemoji (CC BY 4.0)</option>
                        <option value="noto">Noto Emoji (Apache-2.0)</option>
                        <option value="fluent3d">Fluent 3D (MIT) — not mapped</option>
                    </select>
                </div>

                {effectiveSequence && (
                    <div style={{ fontSize: 12, color: "#6b7280" }}>
                        Sequence: {codepointsToHyphenHex(effectiveSequence)}
                    </div>
                )}
            </div>

            <div style={{ display: "flex", gap: 24 }}>
                <div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Font render</div>
                    <div style={{ fontSize: 56, lineHeight: 1 }}>
                        {effectiveSequence ? codepointsToEmoji(effectiveSequence) : ""}
                    </div>
                </div>

                <div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Artwork image</div>
                    {artSet === "fluent3d" ? (
                        <div style={{ fontSize: 12, color: "#9ca3af" }}>{fluentNote()}</div>
                    ) : (
                        <div>
                            {effectiveSequence ? (
                                <img
                                    alt="emoji"
                                    src={artUrl}
                                    style={{ width: 96, height: 96 }}
                                    onError={(e) => {
                                        (e.currentTarget as HTMLImageElement).style.display = "none";
                                    }}
                                />
                            ) : null}
                            <div style={{ fontSize: 12, color: "#6b7280", maxWidth: 520, wordBreak: "break-all" }}>
                                {artUrl}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div style={{ marginTop: 24, fontSize: 12, color: "#6b7280" }}>
                Note: Twemoji requires attribution for distribution. Include license files for all sets used.
            </div>
        </div >
    );
}


