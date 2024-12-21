"use client";

import { useState } from "react";
import { DailyEntry, Supplement } from "../types";
import { deleteDailyEntry } from "../actions";
import { useNotification } from "../contexts/NotificationContext";
import {
  Card,
  CardContent,
  Typography,
  IconButton,
  Stack,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  CircularProgress,
} from "@mui/material";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import BedtimeIcon from "@mui/icons-material/Bedtime";
import WbSunnyIcon from "@mui/icons-material/WbSunny";

interface DailyEntriesProps {
  entries: DailyEntry[];
  supplements: Supplement[];
  onSuccess: () => void;
  onEdit: (entry: DailyEntry) => void;
  isLoading: boolean;
}

export default function DailyEntries({
  entries,
  supplements,
  onSuccess,
  onEdit,
  isLoading,
}: DailyEntriesProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<DailyEntry | null>(null);
  const { showNotification } = useNotification();

  const handleDelete = async () => {
    if (!entryToDelete) return;

    try {
      await deleteDailyEntry(entryToDelete.id);
      showNotification("Запись удалена");
      onSuccess();
    } catch (error) {
      console.error("Error deleting entry:", error);
      showNotification("Ошибка при удалении записи", "error");
    }
    setDeleteDialogOpen(false);
    setEntryToDelete(null);
  };

  const openDeleteDialog = (entry: DailyEntry) => {
    setEntryToDelete(entry);
    setDeleteDialogOpen(true);
  };

  if (entries.length === 0 && !isLoading) {
    return (
      <Typography variant="body1" color="text.secondary" align="center">
        Нет записей
      </Typography>
    );
  }

  // Сортируем записи по дате (сначала новые)
  const sortedEntries = [...entries].sort((a, b) => b.date - a.date);

  return (
    <Box sx={{ position: "relative" }}>
      {isLoading && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            minHeight: "600px",
            justifyContent: "center",
            pt: 30,
            backgroundColor: "rgba(255, 255, 255, 0.7)",
            zIndex: 1,
          }}
        >
          <CircularProgress />
        </Box>
      )}

      <Stack spacing={2} sx={{ opacity: isLoading ? 0.9 : 1 }}>
        {sortedEntries.map((entry) => (
          <Card key={entry.id} variant="outlined">
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                  mt: 2,
                }}
              >
                <Typography variant="h6" component="div">
                  {format(new Date(entry.date), "d MMMM yyyy", { locale: ru })}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  {entry.supplements.some(
                    (s) =>
                      s.supplement.name.startsWith("Время засыпания") ||
                      s.supplement.name.startsWith("Время пробуждения")
                  ) && (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        color: "text.secondary",
                        fontSize: "0.875rem",
                        "& .arrow": {
                          mx: 0.5,
                          display: "inline-flex",
                          alignItems: "center",
                          transform: "translateY(-1px)",
                        },
                      }}
                    >
                      <BedtimeIcon sx={{ fontSize: 16, color: "#5C6BC0" }} />
                      {entry.supplements
                        .find((s) =>
                          s.supplement.name.startsWith("Время засыпания")
                        )
                        ?.supplement.name.split(" ")
                        .pop()}
                      <span className="arrow">→</span>
                      <WbSunnyIcon sx={{ fontSize: 16, color: "#FFA726" }} />
                      {entry.supplements
                        .find((s) =>
                          s.supplement.name.startsWith("Время пробуждения")
                        )
                        ?.supplement.name.split(" ")
                        .pop()}
                    </Box>
                  )}
                  <Chip
                    label={`${entry.rating} / 10`}
                    color="primary"
                    variant="outlined"
                    size="small"
                  />
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <IconButton size="small" onClick={() => onEdit(entry)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => openDeleteDialog(entry)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
              </Box>

              {entry.notes && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {entry.notes}
                  </Typography>
                </Box>
              )}

              <Box>
                {/* Остальные добавки */}
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {entry.supplements
                    .filter(
                      (s) =>
                        !s.supplement.name.startsWith("Время засыпания") &&
                        !s.supplement.name.startsWith("Время пробуждения")
                    )
                    .sort((a, b) =>
                      a.supplement.name.localeCompare(b.supplement.name)
                    )
                    .map((supplement) => (
                      <Chip
                        key={`${entry.id}-${supplement.supplement.id}`}
                        label={supplement.supplement.name}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                </Stack>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Подтверждение удаления</DialogTitle>
        <DialogContent>
          <Typography>
            Вы уверены, что хотите удалить запись за{" "}
            {entryToDelete &&
              format(new Date(entryToDelete.date), "d MMMM yyyy", {
                locale: ru,
              })}
            ?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleDelete} color="error">
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
