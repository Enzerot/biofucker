import * as React from "react";
import { cn } from "@/lib/utils";

export interface SliderProps {
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, min = 0, max = 100, step = 1, value = 0, onChange, ...props }, ref) => {
    const [isDragging, setIsDragging] = React.useState(false);
    const [tempValue, setTempValue] = React.useState(value);
    const sliderRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      if (!isDragging) {
        setTempValue(value);
      }
    }, [value, isDragging]);

    const getValueFromPosition = (clientX: number, shouldRound: boolean = true) => {
      if (!sliderRef.current) return min;
      const rect = sliderRef.current.getBoundingClientRect();
      const percentage = Math.max(
        0,
        Math.min(1, (clientX - rect.left) / rect.width)
      );
      const rawValue = min + percentage * (max - min);
      return shouldRound ? Math.round(rawValue / step) * step : rawValue;
    };

    const handleMouseDown = (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      const newValue = getValueFromPosition(e.clientX, false);
      setTempValue(newValue);
    };

    React.useEffect(() => {
      if (!isDragging) return;

      const handleMouseMove = (e: MouseEvent) => {
        const newValue = getValueFromPosition(e.clientX, false);
        setTempValue(newValue);
      };

      const handleMouseUp = () => {
        const roundedValue = Math.round(tempValue / step) * step;
        const clampedValue = Math.max(min, Math.min(max, roundedValue));
        if (onChange) {
          const fakeEvent = {
            target: { value: clampedValue.toString() },
          } as React.ChangeEvent<HTMLInputElement>;
          onChange(fakeEvent);
        }
        setIsDragging(false);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }, [isDragging, tempValue, onChange, step, min, max]);

    const displayValue = isDragging ? tempValue : value;
    const percentage = ((displayValue - min) / (max - min)) * 100;

    return (
      <div className={cn("relative", className)}>
        <div
          ref={sliderRef}
          className="relative h-2 bg-secondary rounded-lg cursor-pointer"
          onMouseDown={handleMouseDown}
        >
          <div
            className="absolute h-full bg-primary rounded-lg"
            style={{ width: `${percentage}%` }}
          />
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-white border-2 border-primary rounded-full cursor-grab shadow-md transition-transform duration-150 ease-out",
              isDragging && "cursor-grabbing scale-110"
            )}
            style={{ left: `${percentage}%` }}
          />
        </div>
        <input
          type="hidden"
          ref={ref}
          value={value}
          {...props}
        />
      </div>
    );
  }
);
Slider.displayName = "Slider";

export { Slider };
