"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  addDailyEntry,
  updateDailyEntry,
  addSupplement,
} from "../actions";
import { Supplement, DailyEntry } from "../types";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { DateCalendar } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { ru } from "date-fns/locale";
import { useNotification } from "../contexts/NotificationContext";
import { startOfDay, format, isEqual, isToday, addDays } from "date-fns";
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
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from "@mui/icons-material";
import { format as formatDate } from "date-fns";
import { FitbitSleepData } from "../types/fitbit";

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

const TimeRangeSlider = styled(Slider)(({ theme }) => ({
  "& .MuiSlider-thumb": {
    height: 24,
    width: 24,
    backgroundColor: "#fff",
    border: "2px solid currentColor",
    "&:focus, &:hover, &.Mui-active, &.Mui-focusVisible": {
      boxShadow: "inherit",
    },
  },
  "& .MuiSlider-track": {
    height: 4,
  },
  "& .MuiSlider-rail": {
    height: 4,
    opacity: 0.5,
    backgroundColor: "#bfbfbf",
  },
  "& .MuiSlider-valueLabel": {
    lineHeight: 1.2,
    fontSize: 12,
    background: "unset",
    width: 40,
    height: 40,
    padding: 0,
    borderRadius: "50% 50% 50% 0",
    backgroundColor: theme.palette.primary.main,
    transformOrigin: "bottom left",
    transform: "translate(50%, -100%) rotate(-45deg) scale(0)",
    "&:before": { display: "none" },
    "&.MuiSlider-valueLabelOpen": {
      transform: "translate(50%, -100%) rotate(-45deg) scale(1)",
    },
    "& > *": {
      transform: "rotate(45deg)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      height: "100%",
    },
  },
}));

interface FormValues {
  date: Date;
  rating: number;
  notes: string;
  supplements: number[];
  sleepTime: string;
  wakeTime: string;
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
  const [isFitbitConnected, setIsFitbitConnected] = useState(false);
  const [sleepEfficiency, setSleepEfficiency] = useState<number | null>(null);
  const { showNotification } = useNotification();
  const supplementsWithoutHidden = supplements.filter((s) => !s.hidden);

  const { control, handleSubmit, reset, watch, setValue } = useForm<FormValues>(
    {
      defaultValues: {
        date: startOfDay(new Date()),
        rating: 5,
        notes: "",
        supplements: [],
        sleepTime: "00:00",
        wakeTime: "08:00",
      },
    }
  );

  const date = watch("date");

  useEffect(() => {
    const checkFitbitConnection = async () => {
      try {
        const response = await fetch("/api/fitbit/status");
        const { isConnected } = await response.json();
        setIsFitbitConnected(isConnected);
      } catch (error) {
        console.error("Error checking Fitbit connection:", error);
      }
    };
    checkFitbitConnection();
  }, []);

  const roundToNearestQuarter = (timeStr: string): string => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    const totalMinutes = hours * 60 + minutes;
    const roundedMinutes = Math.round(totalMinutes / 15) * 15;
    const newHours = Math.floor(roundedMinutes / 60) % 24;
    const newMinutes = roundedMinutes % 60;
    return `${newHours.toString().padStart(2, "0")}:${newMinutes
      .toString()
      .padStart(2, "0")}`;
  };

  const fetchFitbitSleepData = async () => {
    try {
      const dateStr = formatDate(date, "yyyy-MM-dd");
      const response = await fetch(`/api/fitbit/sleep?date=${dateStr}`);

      if (!response.ok) {
        throw new Error("Failed to fetch sleep data");
      }

      const sleepData = (await response.json()) as FitbitSleepData;

      if (sleepData) {
        // Преобразуем время в формат HH:mm и округляем до 15 минут
        const sleepTime = roundToNearestQuarter(
          sleepData.startTime.split("T")[1].substring(0, 5)
        );
        const wakeTime = roundToNearestQuarter(
          sleepData.endTime.split("T")[1].substring(0, 5)
        );

        setValue("sleepTime", sleepTime);
        setValue("wakeTime", wakeTime);
        setSleepEfficiency(sleepData.efficiency);

        showNotification("Данные о сне успешно загружены из Fitbit", "success");
      } else {
        setSleepEfficiency(null);
        showNotification("Данные о сне не найдены для выбранной даты", "error");
      }
    } catch (error) {
      console.error("Error fetching Fitbit sleep data:", error);
      setSleepEfficiency(null);
      showNotification("Ошибка при загрузке данных из Fitbit", "error");
    }
  };

  // Автоматическая загрузка данных о сне при изменении даты
  useEffect(() => {
    if (isFitbitConnected) {
      fetchFitbitSleepData();
    }
  }, [date, isFitbitConnected]);

  const timeToMinutes = (time?: string): number => {
    if (!time) return 0;
    const [hours, minutes] = time.split(":").map(Number);
    const totalMinutes = hours * 60 + minutes;
    return hours < 21 ? totalMinutes + 180 : totalMinutes - 1260;
  };

  const minutesToTime = (minutes: number): string => {
    const adjustedMinutes = minutes + 1260;
    const totalMinutes =
      adjustedMinutes >= 1440 ? adjustedMinutes - 1440 : adjustedMinutes;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}`;
  };

  // Функция для получения последней записи
  const lastEntry = useMemo(() => {
    if (entries.length === 0) return null;
    return entries.reduce((latest, current) =>
      latest.date > current.date ? latest : current
    );
  }, [entries]);

  // Функция для опреде��ения, есть ли запись на выбранную дату
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

    const extractTimeFromSupplements = (
      supplements: { supplement: Supplement }[]
    ) => {
      let sleepTime = "00:00";
      let wakeTime = "08:00";

      supplements.forEach(({ supplement }) => {
        if (supplement.name.startsWith("Время засыпания")) {
          sleepTime = supplement.name.split(" ").pop() || sleepTime;
        } else if (supplement.name.startsWith("Время пробуждения")) {
          wakeTime = supplement.name.split(" ").pop() || wakeTime;
        }
      });

      return { sleepTime, wakeTime };
    };

    if (editEntry) {
      const entryDate = startOfDay(new Date(editEntry.date));
      const { sleepTime, wakeTime } = extractTimeFromSupplements(
        editEntry.supplements
      );
      reset({
        date: entryDate,
        rating: editEntry.rating,
        notes: editEntry.notes || "",
        supplements: prepareSupplements(editEntry.supplements),
        sleepTime,
        wakeTime,
      });
    } else {
      const todayEntry = findEntryByDate(date);

      if (todayEntry) {
        const { sleepTime, wakeTime } = extractTimeFromSupplements(
          todayEntry.supplements
        );
        reset({
          date,
          rating: todayEntry.rating,
          notes: todayEntry.notes || "",
          supplements: prepareSupplements(todayEntry.supplements),
          sleepTime,
          wakeTime,
        });
      } else {
        reset({
          date,
          rating: 5,
          notes: "",
          supplements: prepareSupplements(lastEntry?.supplements || []),
          sleepTime: "00:00",
          wakeTime: "08:00",
        });
      }
    }
  }, [editEntry, reset, lastEntry]);

  const onSubmit = async (data: FormValues) => {
    try {
      const sleepSupplementName = `Время засыпания ${data.sleepTime}`;
      const wakeSupplementName = `Время пробуждения ${data.wakeTime}`;

      // Фильтруем существующие добавки, связанные со сном
      const filteredSupplements = data.supplements.filter((id) => {
        const supplement = supplements.find((s) => s.id === id);
        return (
          supplement &&
          !supplement.name.startsWith("Время засыпания") &&
          !supplement.name.startsWith("Время пробуждения")
        );
      });

      // Находим или создаем добавку времени
      const existingSleepSupplement = supplements.find(
        (s) => s.name === sleepSupplementName
      );
      console.log(existingSleepSupplement, supplements, sleepSupplementName);
      const existingWakeSupplement = supplements.find(
        (s) => s.name === wakeSupplementName
      );

      const sleepSupplement =
        existingSleepSupplement ||
        (await addSupplement(sleepSupplementName, undefined, true));

      const wakeSupplement =
        existingWakeSupplement ||
        (await addSupplement(wakeSupplementName, undefined, true));

      if (!sleepSupplement || !wakeSupplement) {
        throw new Error("Failed to create supplements");
      }

      const updatedSupplements = [
        ...filteredSupplements,
        sleepSupplement.id,
        wakeSupplement.id,
      ];

      if (editEntry) {
        await updateDailyEntry(editEntry.id, {
          rating: data.rating,
          supplementIds: updatedSupplements,
          notes: data.notes,
        });
        showNotification("Запись успешно обновлена");
        if (!isToday(data.date)) onCancelEdit?.();
      } else {
        await addDailyEntry({
          dateTs: data.date.getTime(),
          rating: data.rating,
          supplementIds: updatedSupplements,
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

  const handleFitbitConnect = () => {
    window.location.href = "/api/fitbit/auth";
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
                <IconButton
                  onClick={() => handleDateChange(addDays(date, -1))}
                  color="primary"
                  size="small"
                >
                  <ChevronLeftIcon />
                </IconButton>
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
                  onClick={() => handleDateChange(addDays(date, 1))}
                  color="primary"
                  size="small"
                >
                  <ChevronRightIcon />
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
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}
              >
                <Typography variant="subtitle2">
                  Рейтинг дня: {watch("rating")}
                </Typography>
                {sleepEfficiency !== null && (
                  <Typography variant="subtitle2" color="primary">
                    Эффективность сна: {sleepEfficiency}%
                  </Typography>
                )}
              </Box>
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
                Время засыпания и пробуждения: {watch("sleepTime")} -{" "}
                {watch("wakeTime")}
              </Typography>
              {!isFitbitConnected && (
                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleFitbitConnect}
                  >
                    Подключить Fitbit
                  </Button>
                </Stack>
              )}
              <Box sx={{ px: 2, py: 1 }}>
                <TimeRangeSlider
                  value={[
                    timeToMinutes(watch("sleepTime")),
                    timeToMinutes(watch("wakeTime")),
                  ]}
                  onChange={(_, value) => {
                    const [sleepValue, wakeValue] = value as number[];
                    setValue("sleepTime", minutesToTime(sleepValue));
                    setValue("wakeTime", minutesToTime(wakeValue));
                  }}
                  min={0}
                  max={1425}
                  step={15}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => minutesToTime(value)}
                  marks={[
                    { value: 0, label: "21:00" },
                    { value: 180, label: "00:00" },
                    { value: 540, label: "06:00" },
                    { value: 900, label: "12:00" },
                    { value: 1260, label: "18:00" },
                    { value: 1425, label: "20:45" },
                  ]}
                  disableSwap
                />
              </Box>
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
                {supplementsWithoutHidden
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
