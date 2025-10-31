import { codepointsToEmoji } from "../emoji";

type SelectedPreviewProps = {
    emoji: number[] | null;
    name: string;
};

export function SelectedPreview(props: SelectedPreviewProps) {
    const { emoji, name } = props;
    if (!emoji) return null;
    return (
        <div style={{
            marginTop: "clamp(20px, 5vw, 24px)",
            padding: "clamp(12px, 3vw, 16px)",
            background: "transparent",
            border: "1px solid var(--muted)",
            borderRadius: 8,
            textAlign: "center",
        }}>
            <div style={{ fontSize: "clamp(36px, 9vw, 48px)", marginBottom: "clamp(6px, 1.5vw, 8px)" }}>
                {codepointsToEmoji(emoji)}
            </div>
            {name && (
                <div style={{ fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--fg)" }}>
                    {name}
                </div>
            )}
        </div>
    );
}


