// Black-Scholes for European calls, r=0, T in days, sigma in daily units.

function normalCDF(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + p * ax);
  const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-ax * ax);
  return 0.5 * (1 + sign * y);
}

function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

function d1d2(S: number, K: number, T: number, sigma: number): [number, number] {
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + 0.5 * sigma * sigma * T) / (sigma * sqrtT);
  return [d1, d1 - sigma * sqrtT];
}

export function bsCallPrice(S: number, K: number, T: number, sigma: number): number {
  if (T <= 0 || sigma <= 0) return Math.max(S - K, 0);
  const [d1, d2] = d1d2(S, K, T, sigma);
  return S * normalCDF(d1) - K * normalCDF(d2);
}

export interface Greeks {
  delta: number;
  gamma: number;
  vega: number;
  theta: number; // per day
}

export function bsGreeks(S: number, K: number, T: number, sigma: number): Greeks {
  if (T <= 0 || sigma <= 0) {
    return { delta: S > K ? 1 : 0, gamma: 0, vega: 0, theta: 0 };
  }
  const sqrtT = Math.sqrt(T);
  const [d1] = d1d2(S, K, T, sigma);
  const phi = normalPDF(d1);
  return {
    delta: normalCDF(d1),
    gamma: phi / (S * sigma * sqrtT),
    vega: S * phi * sqrtT,
    theta: -(S * phi * sigma) / (2 * sqrtT),
  };
}

// Returns implied vol (daily units) or null if no solution exists.
export function impliedVol(C: number, S: number, K: number, T: number): number | null {
  if (T <= 0 || S <= 0 || K <= 0) return null;
  const intrinsic = Math.max(S - K, 0);
  if (C < intrinsic - 1e-3 || C >= S) return null;

  // Brenner-Subrahmanyam initial guess
  let sigma = Math.max(0.01, Math.sqrt((2 * Math.PI) / T) * (C / S));

  for (let i = 0; i < 60; i++) {
    const price = bsCallPrice(S, K, T, sigma);
    const sqrtT = Math.sqrt(T);
    const [d1] = d1d2(S, K, T, sigma);
    const vega = S * normalPDF(d1) * sqrtT;
    if (vega < 1e-12) break;
    const diff = price - C;
    if (Math.abs(diff) < 1e-7) break;
    sigma -= diff / vega;
    if (sigma <= 0) sigma = 1e-6;
    if (sigma > 30) return null;
  }

  return sigma > 0 && sigma < 30 ? sigma : null;
}
