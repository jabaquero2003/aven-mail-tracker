"use client";

interface Props {
  score: number;
  status?: string;
}

export default function ConfidenceBadge({ score, status }: Props) {
  const getColor = () => {
    if (score === 100) return "bg-green-500 text-white border-green-500";
    if (score >= 80) return "bg-green-100 text-green-800 border-green-200";
    if (score >= 60) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-500 text-white border-red-500";
  };

  const getIcon = () => {
    if (score === 100 || status === "valid") return "✓";
    if (score >= 60) return "~";
    return "✗";
  };

  const getLabel = () => {
    if (score === 100) return "Valid";
    if (score === 0) return "Invalid";
    return `${score}%`;
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getColor()}`}>
      <span>{getIcon()}</span>
      <span>{getLabel()}</span>
    </span>
  );
}
