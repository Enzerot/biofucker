"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  addSupplement,
  updateSupplement,
  updateSupplementTags,
} from "../actions";
import { useNotification } from "../contexts/NotificationContext";
import { Supplement, Tag } from "../types";
import TagsInput from "./TagsInput";
import {
  Card,
  CardContent,
  CardHeader,
  TextField,
  Button,
  Stack,
  Box,
} from "@mui/material";

interface FormValues {
  name: string;
  description: string;
  tags: Tag[];
}

interface AddSupplementProps {
  onSuccess: () => void;
  editSupplement?: Supplement;
  onCancelEdit?: () => void;
}

export default function AddSupplement({
  onSuccess,
  editSupplement,
  onCancelEdit,
}: AddSupplementProps) {
  const { showNotification } = useNotification();
  const { control, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: {
      name: "",
      description: "",
      tags: [],
    },
  });

  useEffect(() => {
    if (editSupplement) {
      reset({
        name: editSupplement.name,
        description: editSupplement.description || "",
        tags: editSupplement.tags || [],
      });
    } else {
      reset({
        name: "",
        description: "",
        tags: [],
      });
    }
  }, [editSupplement, reset]);

  const onSubmit = async (data: FormValues) => {
    try {
      if (editSupplement) {
        await updateSupplement(editSupplement.id, {
          name: data.name,
          description: data.description,
        });
        await updateSupplementTags(
          editSupplement.id,
          data.tags.map((tag) => tag.id)
        );
        showNotification("Добавка обновлена");
        onCancelEdit?.();
      } else {
        const supplement = await addSupplement(data.name, data.description);
        await updateSupplementTags(
          supplement.id,
          data.tags.map((tag) => tag.id)
        );
        showNotification("Добавка добавлена");
        reset();
      }
      onSuccess();
    } catch (error) {
      console.error("Error with supplement:", error);
      showNotification("Ошибка при сохранении добавки", "error");
    }
  };

  return (
    <Card variant="outlined">
      <CardHeader
        title={editSupplement ? "Редактирование добавки" : "Новая добавка"}
      />
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack spacing={2}>
            <Controller
              name="name"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Название добавки"
                  fullWidth
                  required
                  size="small"
                />
              )}
            />
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Описание"
                  fullWidth
                  multiline
                  rows={3}
                  size="small"
                />
              )}
            />
            <Controller
              name="tags"
              control={control}
              render={({ field }) => (
                <TagsInput value={field.value} onChange={field.onChange} />
              )}
            />
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                size="large"
              >
                {editSupplement ? "Сохранить" : "Добавить"}
              </Button>
              {editSupplement && (
                <Button
                  onClick={() => {
                    reset();
                    onCancelEdit?.();
                  }}
                  variant="outlined"
                  fullWidth
                  size="large"
                >
                  Отмена
                </Button>
              )}
            </Box>
          </Stack>
        </form>
      </CardContent>
    </Card>
  );
}
