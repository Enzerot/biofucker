"use client";

import { useState, useEffect } from "react";
import { getDailyEntries, getSupplements } from "./actions";
import { DailyEntry, Supplement } from "./types";
import AddEntry from "./components/AddEntry";
import DailyEntries from "./components/DailyEntries";
import AddSupplement from "./components/AddSupplement";
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
        getSupplements(),
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
    <div className="py-8">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-8">
            <div className="add-entry-form">
              <AddEntry
                supplements={supplements}
                entries={entries}
                onSuccess={onDataChange}
                editEntry={editingEntry}
                onEdit={handleEdit}
                onCancelEdit={() => setEditingEntry(undefined)}
              />
            </div>
            <AddSupplement onSuccess={onDataChange} />
          </div>

          <div>
            <DailyEntries
              entries={entries}
              supplements={supplements}
              onSuccess={onDataChange}
              onEdit={handleEdit}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
