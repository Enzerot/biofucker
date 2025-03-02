"use client";

import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { ru } from "date-fns/locale";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
        {children}
      </LocalizationProvider>
  );
}
