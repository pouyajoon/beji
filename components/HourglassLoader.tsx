type HourglassLoaderProps = {
  text?: string;
  size?: number | string;
};

export function HourglassLoader({ text = "Loading world...", size = 24 }: HourglassLoaderProps) {
  const sizeValue = typeof size === 'number' ? `${size}px` : size;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
      }}
    >
      <div
        className="hourglass-loader"
        style={{
          fontSize: sizeValue,
          display: 'inline-block',
        }}
      >
        ⏳
      </div>
      {text && (
        <div
          style={{
            fontSize: '18px',
            color: 'var(--fg)',
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
}

