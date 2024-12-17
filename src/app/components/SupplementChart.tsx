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
import { Box, CircularProgress, Typography } from "@mui/material";

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
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: 400,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (data.length === 0) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: 400,
        }}
      >
        <Typography variant="body1" color="text.secondary">
          Нет данных для отображения
        </Typography>
      </Box>
    );
  }

  const chartData = data.map((item) => ({
    ...item,
    formattedDate: format(new Date(item.date * 1000), "d MMM", { locale: ru }),
  }));

  return (
    <Box sx={{ width: "100%", height: 400 }}>
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
          <XAxis
            dataKey="formattedDate"
            tick={{ fontSize: 12 }}
          />
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
            stroke="#1976d2"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
} 