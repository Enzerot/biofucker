import * as React from "react";
import { cn } from "@/lib/utils";

export interface RangeSliderProps {
  min?: number;
  max?: number;
  step?: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  marks?: { value: number; label: string }[];
  valueLabelFormat?: (value: number) => string;
}

export function RangeSlider({
  min = 0,
  max = 100,
  step = 1,
  value,
  onChange,
  marks = [],
  valueLabelFormat,
}: RangeSliderProps) {
  const [isDragging, setIsDragging] = React.useState<0 | 1 | null>(null);
  const [tempValue, setTempValue] = React.useState<[number, number]>(value);
  const sliderRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isDragging === null) {
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

  const handleMouseDown = (index: 0 | 1) => (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(index);
  };

  React.useEffect(() => {
    if (isDragging === null) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newValue = getValueFromPosition(e.clientX, false);
      if (isDragging === 0) {
        setTempValue([Math.min(newValue, tempValue[1]), tempValue[1]]);
      } else {
        setTempValue([tempValue[0], Math.max(newValue, tempValue[0])]);
      }
    };

    const handleMouseUp = () => {
      const roundedValue: [number, number] = [
        Math.round(tempValue[0] / step) * step,
        Math.round(tempValue[1] / step) * step,
      ];
      onChange(roundedValue);
      setIsDragging(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, tempValue, onChange, step]);

  const displayValue = isDragging !== null ? tempValue : value;
  const percentage0 = ((displayValue[0] - min) / (max - min)) * 100;
  const percentage1 = ((displayValue[1] - min) / (max - min)) * 100;

  return (
    <div className="relative py-4">
      <div
        ref={sliderRef}
        className="relative h-2 bg-secondary rounded-full cursor-pointer"
      >
        <div
          className="absolute h-full bg-primary rounded-full"
          style={{
            left: `${percentage0}%`,
            right: `${100 - percentage1}%`,
          }}
        />

        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-white border-2 border-primary rounded-full cursor-grab shadow-md transition-transform duration-150 ease-out",
            isDragging === 0 && "cursor-grabbing scale-110"
          )}
          style={{ 
            left: `${percentage0}%`,
          }}
          onMouseDown={handleMouseDown(0)}
        >
          {isDragging === 0 && valueLabelFormat && (
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded whitespace-nowrap">
              {valueLabelFormat(Math.round(displayValue[0] / step) * step)}
            </div>
          )}
        </div>

        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-white border-2 border-primary rounded-full cursor-grab shadow-md transition-transform duration-150 ease-out",
            isDragging === 1 && "cursor-grabbing scale-110"
          )}
          style={{ 
            left: `${percentage1}%`,
          }}
          onMouseDown={handleMouseDown(1)}
        >
          {isDragging === 1 && valueLabelFormat && (
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded whitespace-nowrap">
              {valueLabelFormat(Math.round(displayValue[1] / step) * step)}
            </div>
          )}
        </div>
      </div>

      {marks.length > 0 && (
        <div className="relative mt-2">
          {marks.map((mark) => {
            const percentage = ((mark.value - min) / (max - min)) * 100;
            return (
              <div
                key={mark.value}
                className="absolute -translate-x-1/2 text-xs text-muted-foreground"
                style={{ left: `${percentage}%` }}
              >
                {mark.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
