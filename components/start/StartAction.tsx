type StartActionProps = {
    label: string;
    href: string;
    disabled: boolean;
    onActivate: () => void;
};

export function StartAction(props: StartActionProps) {
    const { label, href, disabled, onActivate } = props;
    return (
        <div style={{ display: "flex", justifyContent: "center" }}>
            <a
                href={href}
                onClick={(e) => {
                    if (disabled) {
                        e.preventDefault();
                        return;
                    }
                    onActivate();
                }}
                aria-disabled={disabled}
                role="button"
                style={{
                    display: "inline-block",
                    textAlign: "center",
                    textDecoration: "none",
                    // width: "100%",
                    padding: "16px",
                    border: disabled ? "1px solid var(--muted)" : "1px solid var(--fg)",
                    borderRadius: 8,
                    fontSize: 18,
                    fontWeight: 600,
                    color: disabled ? "var(--muted)" : "var(--fg)",
                    background: "transparent",
                    cursor: disabled ? "not-allowed" : "pointer",
                    transition: "all 0.2s",
                }}
            >
                {label}
            </a>
        </div>
    );
}


