"use client";

const clamp = (v: number) => Math.max(0, Math.min(1, v));

export function Donut({
  label,
  valueText,
  value,
  total,
}: {
  label: string;
  valueText: string;
  value: number;
  total: number;
}) {
  const size = 160;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ratio = total <= 0 ? 0 : clamp(value / total);
  const dash = c * ratio;

  return (
    <div className="relative flex h-[170px] w-[170px] items-center justify-center">
      <svg width={size} height={size} className="absolute inset-0">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#F1F5F9" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#E5E7EB"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${dash} ${c - dash}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="flex flex-col items-center text-center">
        <div className="text-lg font-bold">{valueText}</div>
        <div className="text-xs font-semibold text-gray-500">{label}</div>
      </div>
    </div>
  );
}

