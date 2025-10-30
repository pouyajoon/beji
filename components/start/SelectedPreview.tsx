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
            marginTop: 24,
            padding: 16,
            background: "transparent",
            border: "1px solid var(--muted)",
            borderRadius: 8,
            textAlign: "center",
        }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>
                {codepointsToEmoji(emoji)}
            </div>
            {name && (
                <div style={{ fontSize: 18, fontWeight: 600, color: "var(--fg)" }}>
                    {name}
                </div>
            )}
        </div>
    );
}


