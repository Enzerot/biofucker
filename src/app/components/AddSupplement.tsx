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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

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
    <Card>
      <CardHeader>
        <CardTitle>
          {editSupplement ? "Редактирование добавки" : "Новая добавка"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Название добавки</Label>
            <Controller
              name="name"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <Input
                  {...field}
                  id="name"
                  placeholder="Название добавки"
                  required
                />
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <Textarea
                  {...field}
                  id="description"
                  placeholder="Описание"
                  rows={3}
                />
              )}
            />
          </div>
          <div className="space-y-2">
            <Controller
              name="tags"
              control={control}
              render={({ field }) => (
                <TagsInput value={field.value} onChange={field.onChange} />
              )}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1" size="lg">
              {editSupplement ? "Сохранить" : "Добавить"}
            </Button>
            {editSupplement && (
              <Button
                type="button"
                onClick={() => {
                  reset();
                  onCancelEdit?.();
                }}
                variant="outline"
                className="flex-1"
                size="lg"
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
