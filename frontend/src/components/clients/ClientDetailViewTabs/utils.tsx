import React from "react";

export const getAvatarBadge = (text: string, index: number): React.ReactNode => {
  const palette = [
    { bg: "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300" },
    { bg: "bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300" },
    { bg: "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300" },
    { bg: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300" },
    { bg: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300" },
    { bg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" },
  ];
  const picked = palette[index % palette.length];
  const initials =
    text
      .split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "CL";

  return (
    <div
      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${picked.bg}`}
    >
      {initials}
    </div>
  );
};
