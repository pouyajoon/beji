type HeaderProps = {
    title: string;
    subtitle: string;
};

export function Header(props: HeaderProps) {
    const { title, subtitle } = props;
    return (
        <>
            <h1 style={{
                fontSize: 48,
                fontWeight: 700,
                marginBottom: 8,
                color: 'var(--fg)',
                textAlign: "center",
            }}>
                {title}
            </h1>
            <p style={{
                fontSize: 16,
                color: "var(--muted)",
                textAlign: "center",
                marginBottom: 32,
            }}>
                {subtitle}
            </p>
        </>
    );
}


