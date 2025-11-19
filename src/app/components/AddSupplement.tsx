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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddSupplement({
  onSuccess,
  editSupplement,
  onCancelEdit,
  open,
  onOpenChange,
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
  }, [editSupplement, reset, open]);

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
      onOpenChange(false);
    } catch (error) {
      console.error("Error with supplement:", error);
      showNotification("Ошибка при сохранении добавки", "error");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editSupplement ? "Редактирование добавки" : "Новая добавка"}
          </DialogTitle>
        </DialogHeader>
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
            <Button
              type="button"
              onClick={() => {
                reset();
                onCancelEdit?.();
                onOpenChange(false);
              }}
              variant="outline"
              className="flex-1"
              size="lg"
            >
              Отмена
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
