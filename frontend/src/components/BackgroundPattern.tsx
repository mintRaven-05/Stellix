export default function BackgroundPattern() {
  return (
    <div
      className="absolute inset-0 opacity-[0.25]"
      style={{
        backgroundImage: 'radial-gradient(circle, #FFC940 3.5px, transparent 3.5px)',
        backgroundSize: '12px 12px',
      }}
    />
  );
}
