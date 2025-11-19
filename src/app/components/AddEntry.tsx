"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { addDailyEntry, updateDailyEntry, addSupplement } from "../actions";
import { Supplement, DailyEntry } from "../types";
import { useNotification } from "../contexts/NotificationContext";
import { startOfDay, format, isEqual, isToday, addDays } from "date-fns";
import { ru } from "date-fns/locale";
import { format as formatDate } from "date-fns";
import { FitbitSleepData } from "../types/fitbit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { RangeSlider } from "@/components/ui/range-slider";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [initialEditState, setInitialEditState] = useState<FormValues | null>(
    null
  );
  const { showNotification } = useNotification();
  const supplementsWithoutHidden = supplements.filter((s) => !s.hidden);

  const { control, handleSubmit, reset, watch, setValue, formState } =
    useForm<FormValues>({
      defaultValues: {
        date: startOfDay(new Date()),
        rating: 5,
        notes: "",
        supplements: [],
        sleepTime: "00:00",
        wakeTime: "08:00",
      },
    });

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

  useEffect(() => {
    if (isFitbitConnected && !editEntry) {
      fetchFitbitSleepData();
    }
  }, [date, isFitbitConnected, editEntry]);

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

  const lastEntry = useMemo(() => {
    if (entries.length === 0) return null;
    return entries.reduce((latest, current) =>
      latest.date > current.date ? latest : current
    );
  }, [entries]);

  const hasEntryOnDate = (date: Date) => {
    const targetDate = startOfDay(date);
    return entries.some((entry) => {
      const entryDate = startOfDay(new Date(entry.date));
      return isEqual(targetDate, entryDate);
    });
  };

  const findEntryByDate = (date: Date): DailyEntry | undefined => {
    const targetDate = startOfDay(date);
    return entries.find((entry) => {
      const entryDate = startOfDay(new Date(entry.date));
      return isEqual(targetDate, entryDate);
    });
  };

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
        if (supplement.type === "sleep_start") {
          sleepTime = supplement.name.split(" ").pop() || sleepTime;
        } else if (supplement.type === "sleep_end") {
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
      const initialState = {
        date: entryDate,
        rating: editEntry.rating,
        notes: editEntry.notes || "",
        supplements: prepareSupplements(editEntry.supplements),
        sleepTime,
        wakeTime,
      };
      setInitialEditState(initialState);
      reset(initialState);
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

      const filteredSupplements = data.supplements.filter((id) => {
        const supplement = supplements.find((s) => s.id === id);
        return (
          supplement &&
          supplement.type !== "sleep_start" &&
          supplement.type !== "sleep_end"
        );
      });

      const existingSleepSupplement = supplements.find(
        (s) => s.name === sleepSupplementName
      );
      const existingWakeSupplement = supplements.find(
        (s) => s.name === wakeSupplementName
      );

      const sleepSupplement =
        existingSleepSupplement ||
        (await addSupplement(sleepSupplementName, undefined, true, "sleep_start"));

      const wakeSupplement =
        existingWakeSupplement ||
        (await addSupplement(wakeSupplementName, undefined, true, "sleep_end"));

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
        const dateInUtc = Date.UTC(
          data.date.getFullYear(),
          data.date.getMonth(),
          data.date.getDate()
        );
        await addDailyEntry({
          dateTs: dateInUtc,
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
    if (isToday(date) && editEntry && initialEditState) {
      reset(initialEditState);
    } else {
      onCancelEdit?.();
      handleDateChange(startOfDay(new Date()));
    }
  };

  const handleFitbitConnect = () => {
    window.location.href = "/api/fitbit/auth";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {editEntry ? "Редактировать запись" : "Добавить запись"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label>Дата</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleDateChange(addDays(date, -1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Controller
                name="date"
                control={control}
                render={({ field }) => (
                  <Input
                    value={format(field.value, "dd MMMM yyyy", {
                      locale: ru,
                    })}
                    readOnly
                    onClick={() => setCalendarOpen(true)}
                    className={cn(
                      "cursor-pointer flex-1",
                      editEntry && "text-primary font-bold"
                    )}
                  />
                )}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleDateChange(addDays(date, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Dialog open={calendarOpen} onOpenChange={setCalendarOpen}>
            <DialogContent className="pt-12 pb-3 px-3 max-w-fit">
              <Calendar
                value={date}
                onChange={(newDate) => newDate && handleDateChange(newDate)}
                dayRenderer={(day, isSelected) => {
                  const hasEntry = hasEntryOnDate(day);
                  return (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => handleDateChange(day)}
                        className={cn(
                          "w-full h-9 rounded-md text-sm hover:bg-accent",
                          isSelected &&
                            "bg-primary text-primary-foreground hover:bg-primary/90"
                        )}
                      >
                        {format(day, "d")}
                      </button>
                      {hasEntry && (
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                      )}
                    </div>
                  );
                }}
              />
            </DialogContent>
          </Dialog>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Рейтинг дня: {watch("rating")}</Label>
              {sleepEfficiency !== null && (
                <span className="text-sm text-primary font-medium">
                  Эффективность сна: {sleepEfficiency}%
                </span>
              )}
            </div>
            <Controller
              name="rating"
              control={control}
              render={({ field }) => (
                <Slider
                  min={1}
                  max={10}
                  step={1}
                  value={field.value}
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>
                Время засыпания и пробуждения: {watch("sleepTime")} -{" "}
                {watch("wakeTime")}
              </Label>
              {!isFitbitConnected && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleFitbitConnect}
                >
                  Подключить Fitbit
                </Button>
              )}
            </div>
            <RangeSlider
              value={[
                timeToMinutes(watch("sleepTime")),
                timeToMinutes(watch("wakeTime")),
              ]}
              onChange={(value) => {
                setValue("sleepTime", minutesToTime(value[0]), {
                  shouldDirty: true,
                });
                setValue("wakeTime", minutesToTime(value[1]), {
                  shouldDirty: true,
                });
              }}
              min={0}
              max={1425}
              step={15}
              valueLabelFormat={(value) => minutesToTime(value)}
              marks={[
                { value: 0, label: "21:00" },
                { value: 180, label: "00:00" },
                { value: 540, label: "06:00" },
                { value: 900, label: "12:00" },
                { value: 1260, label: "18:00" },
                { value: 1425, label: "20:45" },
              ]}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Заметки</Label>
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <Textarea
                  {...field}
                  id="notes"
                  rows={4}
                  placeholder="Как прошел день?"
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>Принятые добавки</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {supplementsWithoutHidden
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((supplement) => (
                  <Controller
                    key={supplement.id}
                    name="supplements"
                    control={control}
                    render={({ field }) => (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={field.value.includes(supplement.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              field.onChange([...field.value, supplement.id]);
                            } else {
                              field.onChange(
                                field.value.filter((id) => id !== supplement.id)
                              );
                            }
                          }}
                        />
                        <span className="text-sm">{supplement.name}</span>
                      </label>
                    )}
                  />
                ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1" size="lg">
              {editEntry ? "Сохранить изменения" : "Сохранить запись"}
            </Button>
            {editEntry && onCancelEdit && (
              <Button
                type="button"
                onClick={handleCancelEdit}
                variant="outline"
                className="flex-1"
                size="lg"
                disabled={isToday(date) && !formState.isDirty}
              >
                Отмена
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
