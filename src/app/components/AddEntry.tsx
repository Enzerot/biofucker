"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { addDailyEntry, updateDailyEntry } from "../actions";
import { Supplement, DailyEntry } from "../types";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { DateCalendar } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { ru } from "date-fns/locale";
import { useNotification } from "../contexts/NotificationContext";
import { startOfDay, format, isEqual, isToday } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  TextField,
  Slider,
  Checkbox,
  FormControlLabel,
  Button,
  Box,
  Grid,
  Stack,
  IconButton,
  Dialog,
  Badge,
  styled,
} from "@mui/material";
import { CalendarMonth as CalendarIcon } from "@mui/icons-material";

const StyledBadge = styled(Badge)(({ theme }) => ({
  "& .MuiBadge-badge": {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.main,
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
    "&::after": {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      borderRadius: "50%",
      border: "1px solid currentColor",
      content: '""',
    },
  },
}));

const StyledDay = styled("button")(({ theme }) => ({
  ...theme.typography.caption,
  padding: 0,
  width: 36,
  height: 36,
  border: "none",
  background: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
  cursor: "pointer",
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
  "&.Mui-selected": {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    "&:hover": {
      backgroundColor: theme.palette.primary.dark,
    },
  },
  "&.Mui-disabled": {
    opacity: 0.5,
    pointerEvents: "none",
  },
}));

interface FormValues {
  date: Date;
  rating: number;
  notes: string;
  supplements: number[];
}

interface AddEntryProps {
  supplements: Supplement[];
  entries: DailyEntry[];
  onSuccess: () => void;
  editEntry?: DailyEntry;
  onCancelEdit?: () => void;
  onEdit: (entry: DailyEntry | undefined) => void;
}

export default function AddEntry({
  supplements,
  entries,
  onSuccess,
  editEntry,
  onCancelEdit,
  onEdit,
}: AddEntryProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { showNotification } = useNotification();

  const { control, handleSubmit, reset, watch, setValue } = useForm<FormValues>(
    {
      defaultValues: {
        date: startOfDay(new Date()),
        rating: 5,
        notes: "",
        supplements: [],
      },
    }
  );

  const date = watch("date");

  // Функция для получения последней записи
  const lastEntry = useMemo(() => {
    if (entries.length === 0) return null;
    return entries.reduce((latest, current) =>
      latest.date > current.date ? latest : current
    );
  }, [entries]);

  // Функция для определения, есть ли запись на выбранную дату
  const hasEntryOnDate = (date: Date) => {
    const targetDate = startOfDay(date);
    return entries.some((entry) => {
      const entryDate = startOfDay(new Date(entry.date));
      return isEqual(targetDate, entryDate);
    });
  };

  // Функция для поиска записи по дате
  const findEntryByDate = (date: Date): DailyEntry | undefined => {
    const targetDate = startOfDay(date);
    return entries.find((entry) => {
      const entryDate = startOfDay(new Date(entry.date));
      return isEqual(targetDate, entryDate);
    });
  };

  // Обработчик изменения даты
  const handleDateChange = (newDate: Date) => {
    const utcDate = startOfDay(newDate);
    setValue("date", utcDate);
    setCalendarOpen(false);
    const existingEntry = findEntryByDate(utcDate);
    if (existingEntry) {
      onEdit(existingEntry);
    } else {
      onEdit(undefined);
    }
  };

  // Заполнение формы при монтировании или изменении editEntry
  useEffect(() => {
    const prepareSupplements = (supplements: { supplement: Supplement }[]) => {
      return supplements
        .filter((s) => !s.supplement.hidden)
        .map((s) => s.supplement.id);
    };

    if (editEntry) {
      const entryDate = startOfDay(new Date(editEntry.date));
      reset({
        date: entryDate,
        rating: editEntry.rating,
        notes: editEntry.notes || "",
        supplements: prepareSupplements(editEntry.supplements),
      });
    } else {
      const todayEntry = findEntryByDate(date);

      if (todayEntry) {
        reset({
          date,
          rating: todayEntry.rating,
          notes: todayEntry.notes || "",
          supplements: prepareSupplements(todayEntry.supplements),
        });
      } else {
        reset({
          date,
          rating: 5,
          notes: "",
          supplements: prepareSupplements(lastEntry?.supplements || []),
        });
      }
    }
  }, [editEntry, reset, lastEntry]);

  const onSubmit = async (data: FormValues) => {
    try {
      if (editEntry) {
        await updateDailyEntry(editEntry.id, {
          rating: data.rating,
          supplementIds: data.supplements,
          notes: data.notes,
        });
        showNotification("Запись успешно обновлена");
        if (!isToday(data.date)) onCancelEdit?.();
      } else {
        await addDailyEntry({
          dateTs: data.date.getTime(),
          rating: data.rating,
          supplementIds: data.supplements,
          notes: data.notes,
        });
        showNotification("Запись успешно добавлена");
        reset();
      }
      onSuccess();
    } catch (error) {
      console.error("Error saving entry:", error);
      showNotification("Ошибка при сохранении записи", "error");
    }
  };

  const handleCancelEdit = () => {
    onCancelEdit?.();
    handleDateChange(startOfDay(new Date()));
  };

  return (
    <Card variant="outlined">
      <CardHeader
        title={editEntry ? "Редактировать запись" : "Добавить запись"}
      />
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Дата
              </Typography>
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <Controller
                  name="date"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      value={format(field.value, "dd MMMM yyyy", {
                        locale: ru,
                      })}
                      fullWidth
                      size="small"
                      InputProps={{
                        readOnly: true,
                        sx: {
                          cursor: "pointer",
                          color: editEntry ? "primary.main" : "inherit",
                          fontWeight: editEntry ? "bold" : "normal",
                        },
                      }}
                      onClick={() => setCalendarOpen(true)}
                    />
                  )}
                />
                <IconButton
                  onClick={() => setCalendarOpen(true)}
                  color="primary"
                  size="small"
                >
                  <CalendarIcon />
                </IconButton>
              </Box>
            </Box>

            <Dialog
              open={calendarOpen}
              onClose={() => setCalendarOpen(false)}
              PaperProps={{
                sx: {
                  p: 0,
                  "& .MuiDateCalendar-root": {
                    width: 320,
                    height: "auto",
                  },
                },
              }}
            >
              <LocalizationProvider
                dateAdapter={AdapterDateFns}
                adapterLocale={ru}
              >
                <DateCalendar
                  value={date}
                  onChange={(newDate) => newDate && handleDateChange(newDate)}
                  slots={{
                    day: (props) => {
                      const hasEntry = hasEntryOnDate(props.day);
                      return (
                        <StyledBadge
                          key={props.day.toString()}
                          overlap="circular"
                          variant={hasEntry ? "dot" : undefined}
                          color="primary"
                        >
                          <StyledDay
                            onClick={() => props.onDaySelect?.(props.day)}
                            className={props.selected ? "Mui-selected" : ""}
                            type="button"
                            disabled={props.disabled}
                          >
                            {props.day.getDate()}
                          </StyledDay>
                        </StyledBadge>
                      );
                    },
                  }}
                />
              </LocalizationProvider>
            </Dialog>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Рейтинг дня: {watch("rating")}
              </Typography>
              <Controller
                name="rating"
                control={control}
                render={({ field }) => (
                  <Slider
                    {...field}
                    min={1}
                    max={10}
                    step={1}
                    valueLabelDisplay="auto"
                  />
                )}
              />
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Заметки
              </Typography>
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    multiline
                    rows={4}
                    fullWidth
                    placeholder="Как прошел день?"
                    size="small"
                  />
                )}
              />
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Принятые добавки
              </Typography>
              <Grid container spacing={1}>
                {supplements
                  .filter((supplement) => !supplement.hidden)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((supplement) => (
                    <Grid item xs={12} sm={6} key={supplement.id}>
                      <Controller
                        name="supplements"
                        control={control}
                        render={({ field }) => (
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={field.value.includes(supplement.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    field.onChange([
                                      ...field.value,
                                      supplement.id,
                                    ]);
                                  } else {
                                    field.onChange(
                                      field.value.filter(
                                        (id) => id !== supplement.id
                                      )
                                    );
                                  }
                                }}
                              />
                            }
                            label={supplement.name}
                          />
                        )}
                      />
                    </Grid>
                  ))}
              </Grid>
            </Box>

            <Stack direction="row" spacing={2}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                size="large"
              >
                {editEntry ? "Сохранить изменения" : "Сохранить запись"}
              </Button>
              {editEntry && onCancelEdit && (
                <Button
                  onClick={handleCancelEdit}
                  variant="outlined"
                  fullWidth
                  size="large"
                  disabled={isToday(date)}
                >
                  Отмена
                </Button>
              )}
            </Stack>
          </Box>
        </form>
      </CardContent>
    </Card>
  );
}
