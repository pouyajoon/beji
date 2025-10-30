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
        <div style={{ marginBottom: 32 }}>
            <label style={{
                display: "block",
                fontSize: 14,
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
                    padding: "12px 16px",
                    border: "1px solid var(--muted)",
                    borderRadius: 8,
                    fontSize: 16,
                    outline: "none",
                    background: "transparent",
                    color: "var(--fg)",
                }}
            />
        </div>
    );
}


