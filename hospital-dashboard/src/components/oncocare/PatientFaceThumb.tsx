import { useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  url: string | null;
  initials: string;
  className?: string;
};

/** Avatar com fallback para iniciais se a URL falhar (404, CORS, etc.). */
export function PatientFaceThumb({ url, initials, className }: Props) {
  const [broken, setBroken] = useState(false);
  const showImg = Boolean(url?.trim()) && !broken;

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden border border-[#E8EAED] bg-gradient-to-b from-[#5ac8fa] to-[#007aff] font-black text-white shadow-sm rounded-2xl",
        className
      )}
      aria-hidden
    >
      {showImg ? (
        <img
          src={url!}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setBroken(true)}
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="leading-none">{initials}</span>
      )}
    </div>
  );
}
