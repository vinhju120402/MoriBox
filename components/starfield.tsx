// Deterministic "random" star field — same on server and client render
// (no Math.random()/Date at render time), just scattered via the golden angle.
function generateStars(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const seed = i * 137.508;
    return {
      top: `${(seed * 3.7) % 100}%`,
      left: `${(seed * 5.3) % 100}%`,
      size: 1 + (i % 3),
      delay: `${(i % 12) * 0.35}s`,
      duration: `${2.5 + (i % 5) * 0.6}s`,
    };
  });
}

interface StarfieldProps {
  count?: number;
}

export default function Starfield({ count = 60 }: StarfieldProps) {
  const stars = generateStars(count);

  return (
    <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden">
      {stars.map((s, i) => (
        <span
          key={i}
          className="onboard-star absolute rounded-full bg-white"
          style={{
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            animationDelay: s.delay,
            animationDuration: s.duration,
          }}
        />
      ))}
    </div>
  );
}
