import { codepointsToEmoji } from "../emoji";

type EmojiPickerProps = {
    label: string;
    emojiGrid: number[][];
    selectedEmoji: number[] | null;
    onSelect: (codePoints: number[]) => void;
};

export function EmojiPicker(props: EmojiPickerProps) {
    const { label, emojiGrid, selectedEmoji, onSelect } = props;
    return (
        <div style={{ marginBottom: "clamp(20px, 5vw, 24px)" }}>
            <label style={{
                display: "block",
                fontSize: "clamp(13px, 3vw, 14px)",
                fontWeight: 500,
                color: "var(--fg)",
                marginBottom: 8,
            }}>
                {label}
            </label>
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(clamp(48px, 12vw, 64px), 1fr))",
                gap: "clamp(4px, 1vw, 8px)",
                background: "transparent",
                border: "1px solid var(--muted)",
                overflowY: "auto",
                justifyContent: "center",
                padding: "clamp(8px, 2vw, 12px)",
            }}>
                {emojiGrid.map((codePoints, index) => {
                    const isSelected = Array.isArray(selectedEmoji)
                        && selectedEmoji.length === codePoints.length
                        && codePoints.every((v, i) => v === selectedEmoji[i]);
                    return (
                        <button
                            key={index}
                            onClick={() => onSelect(codePoints)}
                            style={{
                                width: "100%",
                                aspectRatio: "1",
                                border: isSelected ? "2px solid var(--fg)" : "2px solid transparent",
                                background: "transparent",
                                cursor: "pointer",
                                fontSize: "clamp(24px, 6vw, 32px)",
                                borderRadius: 8,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                minWidth: 0,
                            }}
                            aria-pressed={isSelected}
                        >
                            {codepointsToEmoji(codePoints)}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}


