type BejiNameInputProps = {
    label: string;
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
    onEnter: () => void;
};

export function BejiNameInput(props: BejiNameInputProps) {
    const { label, placeholder, value, onChange, onEnter } = props;
    return (
        <div style={{ marginBottom: "clamp(24px, 6vw, 32px)" }}>
            <label style={{
                display: "block",
                fontSize: "clamp(13px, 3vw, 14px)",
                fontWeight: 500,
                color: "var(--fg)",
                marginBottom: 8,
            }}>
                {label}
            </label>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter") onEnter();
                }}
                placeholder={placeholder}
                style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "clamp(10px, 2.5vw, 12px) clamp(12px, 3vw, 16px)",
                    border: "1px solid var(--muted)",
                    borderRadius: 8,
                    fontSize: "clamp(15px, 3.5vw, 16px)",
                    outline: "none",
                    background: "transparent",
                    color: "var(--fg)",
                }}
            />
        </div>
    );
}


