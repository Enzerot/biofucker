"use client";

import { useState, useEffect } from "react";
import { Tag } from "../types";
import { getTags, addTag } from "../actions";
import {
  Autocomplete,
  TextField,
  Chip,
  Box,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { useNotification } from "../contexts/NotificationContext";

interface TagsInputProps {
  value: Tag[];
  onChange: (tags: Tag[]) => void;
}

export default function TagsInput({ value, onChange }: TagsInputProps) {
  const [allTags, setAllTags] = useState<Tag[]>([]);
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

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Autocomplete
        multiple
        options={allTags}
        value={value}
        getOptionLabel={(option) => option.name}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        onChange={(_, newValue) => onChange(newValue)}
        renderInput={(params) => (
          <TextField {...params} label="Теги" size="small" />
        )}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip
              variant="outlined"
              label={option.name}
              size="small"
              {...getTagProps({ index })}
            />
          ))
        }
        sx={{ flex: 1 }}
      />
      <IconButton size="small" onClick={() => setNewTagDialogOpen(true)}>
        <AddIcon />
      </IconButton>

      <Dialog
        open={newTagDialogOpen}
        onClose={() => setNewTagDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Новый тег</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Название тега"
            fullWidth
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewTagDialogOpen(false)}>Отмена</Button>
          <Button
            onClick={handleCreateTag}
            variant="contained"
            disabled={!newTagName.trim()}
          >
            Добавить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
