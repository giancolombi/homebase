import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  rating: number;
  onRate?: (rating: number) => void;
  size?: "sm" | "md";
  readonly?: boolean;
}

export default function StarRating({
  rating,
  onRate,
  size = "md",
  readonly = false,
}: Props) {
  const [hover, setHover] = useState(0);
  const starSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onRate?.(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          className={cn(
            "transition-colors",
            readonly ? "cursor-default" : "cursor-pointer hover:scale-110",
          )}
        >
          <Star
            className={cn(
              starSize,
              (hover || rating) >= star
                ? "fill-yellow-400 text-yellow-400"
                : "fill-none text-muted-foreground/40",
            )}
          />
        </button>
      ))}
    </div>
  );
}
