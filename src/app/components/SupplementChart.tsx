"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { getSupplementRatings } from "../actions";
import { Loader2 } from "lucide-react";

interface SupplementChartProps {
  supplementId: number;
  supplementName: string;
}

export default function SupplementChart({
  supplementId,
  supplementName,
}: SupplementChartProps) {
  const [data, setData] = useState<{ date: number; rating: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const ratings = await getSupplementRatings(supplementId);
        setData(ratings);
      } catch (error) {
        console.error("Error loading ratings:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [supplementId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex justify-center items-center h-[400px]">
        <p className="text-muted-foreground">Нет данных для отображения</p>
      </div>
    );
  }

  const chartData = data.map((item) => ({
    ...item,
    formattedDate: format(new Date(item.date * 1000), "d MMM", { locale: ru }),
  }));

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer>
        <LineChart
          data={chartData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 10,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="formattedDate" tick={{ fontSize: 12 }} />
          <YAxis
            domain={[1, 10]}
            ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            formatter={(value: number) => [value, "Оценка"]}
            labelFormatter={(label: string) => `Дата: ${label}`}
          />
          <Line
            type="monotone"
            dataKey="rating"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
