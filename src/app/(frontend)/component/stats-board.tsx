import { ReactNode } from "react";

type StatsBoardProps = {
  title: string;
  rows: ReactNode[][];
};

export default function StatsBoard({ title, rows }: StatsBoardProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center bg-(--color-main) p-3 h-14 shadow-[inset_3px_3px_0_var(--light-main),inset_-3px_-3px_0_var(--dark-main)]">
        <span className="text-white font-semibold truncate">{title}</span>
      </div>
      <div className="flex flex-col">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-2">
            {row.map((cell, cellIndex) => (
              <div
                key={cellIndex}
                className="flex items-center bg-gray-700 p-3 h-10 shadow-[inset_3px_3px_0_var(--dark-main),inset_-3px_-3px_0_var(--light-main)] min-w-0"
              >
                <span className="truncate">{cell}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
