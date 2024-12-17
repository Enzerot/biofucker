"use client";

import { useState, useEffect } from "react";
import { getDailyEntries, getSupplements } from "./actions";
import { DailyEntry, Supplement } from "./types";
import AddEntry from "./components/AddEntry";
import DailyEntries from "./components/DailyEntries";
import AddSupplement from "./components/AddSupplement";
import { Container, Grid, Box, Stack } from "@mui/material";
import { isToday } from "date-fns";

export default function Home() {
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingEntry, setEditingEntry] = useState<DailyEntry | undefined>(
    undefined
  );

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [newSupplements, newEntries] = await Promise.all([
        getSupplements(true),
        getDailyEntries(),
      ]);
      setSupplements(newSupplements);
      setEntries(newEntries);

      const todayEntry = newEntries.find((entry) =>
        isToday(new Date(entry.date))
      );
      if (todayEntry) {
        setEditingEntry(todayEntry);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onDataChange = () => {
    loadData();
  };

  const handleEdit = (entry: DailyEntry | undefined) => {
    setEditingEntry(entry);
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  };

  return (
    <Box sx={{ py: 4 }}>
      <Container maxWidth="xl">
        <Grid container spacing={4}>
          <Grid item xs={12} lg={6}>
            <Stack spacing={4}>
              <Box className="add-entry-form">
                <AddEntry
                  supplements={supplements}
                  entries={entries}
                  onSuccess={onDataChange}
                  editEntry={editingEntry}
                  onEdit={handleEdit}
                  onCancelEdit={() => setEditingEntry(undefined)}
                />
              </Box>
              <AddSupplement onSuccess={onDataChange} />
            </Stack>
          </Grid>

          <Grid item xs={12} lg={6}>
            <DailyEntries
              entries={entries}
              supplements={supplements}
              onSuccess={onDataChange}
              onEdit={handleEdit}
              isLoading={isLoading}
            />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
