"use client";

interface Props {
  score: number;
  status?: string;
}

export default function ConfidenceBadge({ score, status }: Props) {
  const getColor = () => {
    if (score >= 80) return "bg-green-100 text-green-800 border-green-200";
    if (score >= 50) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  const getIcon = () => {
    if (status === "valid" || score >= 80) return "✓";
    if (score >= 50) return "~";
    return "✗";
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getColor()}`}>
      <span>{getIcon()}</span>
      <span>{score}%</span>
    </span>
  );
}
