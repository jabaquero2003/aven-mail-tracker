"use client";

interface Props {
  progress: number;
  label?: string;
}

export default function ProgressBar({ progress, label }: Props) {
  return (
    <div className="w-full space-y-1">
      {label && <p className="text-xs text-gray-500">{label}</p>}
      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-black h-1.5 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      <p className="text-xs text-gray-400 text-right">{Math.round(progress)}%</p>
    </div>
  );
}
