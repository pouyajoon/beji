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
        <div style={{ marginBottom: 24 }}>
            <label style={{
                display: "block",
                fontSize: 14,
                fontWeight: 500,
                color: "var(--fg)",
                marginBottom: 8,
            }}>
                {label}
            </label>
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(64px, 64px))",
                gridAutoRows: "64px",
                background: "transparent",
                border: "1px solid var(--muted)",
                overflowY: "auto",
                justifyContent: "center",
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
                                width: 64,
                                height: 64,
                                border: isSelected ? "2px solid var(--fg)" : "2px solid transparent",
                                background: "transparent",
                                cursor: "pointer",
                                fontSize: 32,
                                borderRadius: 8,
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


