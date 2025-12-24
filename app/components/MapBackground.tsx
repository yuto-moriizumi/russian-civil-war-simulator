export function MapBackground() {
  return (
    <div className="absolute inset-0 -z-10">
      <div className="absolute inset-0 bg-zinc-950" />
      <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:80px_80px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.18),transparent_45%),radial-gradient(circle_at_70%_65%,rgba(220,38,38,0.22),transparent_50%),radial-gradient(circle_at_55%_90%,rgba(245,158,11,0.10),transparent_55%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/70" />
    </div>
  );
}
