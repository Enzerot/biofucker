"use client";

import { useState, useEffect } from "react";
import { Tag } from "../types";
import { getTags, addTag } from "../actions";
import { useNotification } from "../contexts/NotificationContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { X, Plus } from "lucide-react";

interface TagsInputProps {
  value: Tag[];
  onChange: (tags: Tag[]) => void;
}

export default function TagsInput({ value, onChange }: TagsInputProps) {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [newTagDialogOpen, setNewTagDialogOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const { showNotification } = useNotification();

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    const tags = await getTags();
    setAllTags(tags);
  };

  const handleCreateTag = async () => {
    try {
      const tag = await addTag(newTagName);
      setAllTags([...allTags, tag]);
      onChange([...value, tag]);
      setNewTagName("");
      setNewTagDialogOpen(false);
      showNotification("Тег добавлен");
    } catch (error) {
      console.error("Error creating tag:", error);
      showNotification("Ошибка при создании тега", "error");
    }
  };

  const handleToggleTag = (tag: Tag) => {
    const isSelected = value.some((t) => t.id === tag.id);
    if (isSelected) {
      onChange(value.filter((t) => t.id !== tag.id));
    } else {
      onChange([...value, tag]);
    }
  };

  return (
    <div className="space-y-2">
      <Label>Теги</Label>
      <div className="flex items-center gap-2 flex-wrap">
        {value.map((tag) => (
          <Badge key={tag.id} variant="secondary" className="gap-1">
            {tag.name}
            <button
              type="button"
              onClick={() => handleToggleTag(tag)}
              className="ml-1 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Добавить тег
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Выберите теги</DialogTitle>
          </DialogHeader>
          <div className="flex flex-wrap gap-2 py-4">
            {allTags.map((tag) => (
              <Badge
                key={tag.id}
                variant={
                  value.some((t) => t.id === tag.id) ? "default" : "outline"
                }
                className="cursor-pointer"
                onClick={() => handleToggleTag(tag)}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setNewTagDialogOpen(true)}
            >
              Создать новый тег
            </Button>
            <Button type="button" onClick={() => setIsOpen(false)}>
              Готово
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newTagDialogOpen} onOpenChange={setNewTagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новый тег</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              autoFocus
              placeholder="Название тега"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newTagName.trim()) {
                  handleCreateTag();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setNewTagDialogOpen(false)}
            >
              Отмена
            </Button>
            <Button
              type="button"
              onClick={handleCreateTag}
              disabled={!newTagName.trim()}
            >
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
