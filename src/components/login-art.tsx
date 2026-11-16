/** Night pitch for the sign-in page: floodlights flicker on, the lines draw in, a ball rolls across. Pure CSS. */
export function LoginArt() {
  return (
    <div className="auth-flood relative flex min-h-[230px] flex-col justify-end overflow-hidden p-6 text-[#f2f6ee] md:min-h-[600px] md:p-11">
      <div className="auth-lamp auth-lamp-l" aria-hidden="true" />
      <div className="auth-lamp auth-lamp-r" aria-hidden="true" />
      <svg className="auth-lines absolute inset-0 size-full" viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect x="30" y="30" width="540" height="340" rx="4" />
        <line x1="300" y1="30" x2="300" y2="370" />
        <circle cx="300" cy="200" r="58" />
        <rect x="30" y="120" width="70" height="160" />
        <rect x="500" y="120" width="70" height="160" />
      </svg>
      <span className="auth-ball" aria-hidden="true" />
      <div className="absolute inset-0 z-[2] bg-gradient-to-b from-transparent from-30% to-[rgb(8_20_13/0.8)]" aria-hidden="true" />
      <div className="relative z-[3] flex flex-col gap-2">
        <span className="auth-chip">Lights on · slots open tonight</span>
        <p className="font-heading text-[28px] leading-[1.05] font-semibold md:text-[44px]">Book tonight&apos;s game in a minute.</p>
        <p className="max-w-[34ch] text-[#f2f6ee]/80">Football, box cricket and pickleball turfs across Ahmedabad.</p>
      </div>
    </div>
  );
}
