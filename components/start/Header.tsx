type HeaderProps = {
    title: string;
    subtitle: string;
};

export function Header(props: HeaderProps) {
    const { title, subtitle } = props;
    return (
        <>
            <h1 style={{
                fontSize: "clamp(32px, 8vw, 48px)",
                fontWeight: 700,
                marginBottom: "clamp(8px, 2vw, 12px)",
                color: 'var(--fg)',
                textAlign: "center",
            }}>
                {title}
            </h1>
            <p style={{
                fontSize: "clamp(14px, 3.5vw, 16px)",
                color: "var(--muted)",
                textAlign: "center",
                marginBottom: "clamp(24px, 6vw, 32px)",
                lineHeight: 1.5,
            }}>
                {subtitle}
            </p>
        </>
    );
}


