"use client";

import { deleteSupplement, toggleSupplementVisibility } from "../actions";
import { useState, useMemo } from "react";
import { Supplement } from "../types";
import { useNotification } from "../contexts/NotificationContext";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Stack,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Button,
  Tooltip,
  TextField,
  Select,
  MenuItem,
  Collapse,
  FormControl,
  InputLabel,
  OutlinedInput,
  ListItemText,
  Checkbox,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Search as SearchIcon,
  Sort as SortIcon,
  Clear as ClearIcon,
  Timeline as TimelineIcon,
} from "@mui/icons-material";
import SupplementChart from "./SupplementChart";

interface SupplementStatsProps {
  supplements: Supplement[];
  onSuccess: () => void;
  onEdit: (supplement: Supplement) => void;
}

export default function SupplementStats({
  supplements,
  onSuccess,
  onEdit,
}: SupplementStatsProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [chartSupplement, setChartSupplement] = useState<Supplement | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [sortType, setSortType] = useState("difference");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const { showNotification } = useNotification();

  const allTags = useMemo(() => {
    const tagsMap = new Map<number, { id: number; name: string }>();
    supplements.forEach((supplement) => {
      supplement.tags?.forEach((tag) => {
        tagsMap.set(tag.id, tag);
      });
    });
    return Array.from(tagsMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [supplements]);

  const handleDelete = async (id: number) => {
    try {
      await deleteSupplement(id);
      setDeleteConfirmId(null);
      showNotification("Добавка успешно удалена");
      onSuccess();
    } catch (error) {
      console.error("Error deleting supplement:", error);
    }
  };

  const handleToggleVisibility = async (supplement: Supplement) => {
    try {
      await toggleSupplementVisibility(supplement.id);
      showNotification(
        supplement.hidden ? "Добавка п��казана" : "Добавка скрыта"
      );
      onSuccess();
    } catch (error) {
      console.error("Error toggling visibility:", error);
    }
  };

  const handleTagClick = (tagId: number) => {
    setShowFilters(true);
    if (!selectedTags.includes(tagId)) {
      setSelectedTags([...selectedTags, tagId]);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedTags([]);
    setSortType("difference");
  };

  const filteredAndSortedSupplements = supplements
    .filter((supplement) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        supplement.name.toLowerCase().includes(searchLower) ||
        supplement.tags?.some((tag) =>
          tag.name.toLowerCase().includes(searchLower)
        ) ||
        supplement.description?.toLowerCase().includes(searchLower);

      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.every((tagId) =>
          supplement.tags?.some((tag) => tag.id === tagId)
        );

      return matchesSearch && matchesTags;
    })
    .sort((a, b) => {
      switch (sortType) {
        case "difference":
          return (
            (b.ratingDifference ?? 0) - (a.ratingDifference ?? 0) ||
            a.name.localeCompare(b.name)
          );
        case "difference_asc":
          return (
            (a.ratingDifference ?? 0) - (b.ratingDifference ?? 0) ||
            a.name.localeCompare(b.name)
          );
        case "rating":
          return (
            (b.averageRating ?? 0) - (a.averageRating ?? 0) ||
            a.name.localeCompare(b.name)
          );
        case "rating_asc":
          return (
            (a.averageRating ?? 0) - (b.averageRating ?? 0) ||
            a.name.localeCompare(b.name)
          );
        case "name":
          return a.name.localeCompare(b.name);
        case "name_desc":
          return b.name.localeCompare(a.name);
        case "tags":
          return (
            (b.tags?.length ?? 0) - (a.tags?.length ?? 0) ||
            a.name.localeCompare(b.name)
          );
        case "tags_asc":
          return (
            (a.tags?.length ?? 0) - (b.tags?.length ?? 0) ||
            a.name.localeCompare(b.name)
          );
        default:
          return 0;
      }
    });

  return (
    <Card variant="outlined">
      <CardContent>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
            mt: 2,
          }}
        >
          <Typography variant="h5" component="h2" sx={{ fontWeight: "bold" }}>
            Список добавок
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Tooltip title="Очистить фильтры">
              <IconButton
                onClick={handleClearFilters}
                color="default"
                size="small"
                sx={{
                  visibility:
                    searchQuery ||
                    selectedTags.length > 0 ||
                    sortType !== "difference"
                      ? "visible"
                      : "hidden",
                }}
              >
                <ClearIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Поиск и сортировка">
              <IconButton
                onClick={() => setShowFilters(!showFilters)}
                color={showFilters ? "primary" : "default"}
              >
                <SearchIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Collapse in={showFilters}>
          <Box sx={{ mb: 3, display: "flex", gap: 2, flexDirection: "column" }}>
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                size="small"
                label="Поиск"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                fullWidth
                placeholder="Поиск по названию, тегам или описанию"
              />
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Сортировка</InputLabel>
                <Select
                  value={sortType}
                  onChange={(e) => setSortType(e.target.value)}
                  label="Сортировка"
                >
                  <MenuItem value="rating">По рейтингу (↓)</MenuItem>
                  <MenuItem value="rating_asc">По рейтингу (↑)</MenuItem>
                  <MenuItem value="difference">По разнице (↓)</MenuItem>
                  <MenuItem value="difference_asc">По разнице (↑)</MenuItem>
                  <MenuItem value="name">По названию (А-Я)</MenuItem>
                  <MenuItem value="name_desc">По названию (Я-А)</MenuItem>
                  <MenuItem value="tags">По количеству тегов (↓)</MenuItem>
                  <MenuItem value="tags_asc">По количеству тегов (↑)</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <FormControl size="small" fullWidth>
              <InputLabel>Фильтр по тегам</InputLabel>
              <Select
                multiple
                value={selectedTags}
                onChange={(e) =>
                  setSelectedTags(
                    typeof e.target.value === "string" ? [] : e.target.value
                  )
                }
                input={<OutlinedInput label="Фильтр по тегам" />}
                renderValue={(selected) => (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {selected.map((tagId) => (
                      <Chip
                        key={tagId}
                        label={allTags.find((t) => t.id === tagId)?.name}
                        size="small"
                      />
                    ))}
                  </Box>
                )}
              >
                {allTags.map((tag) => (
                  <MenuItem key={tag.id} value={tag.id}>
                    <Checkbox checked={selectedTags.includes(tag.id)} />
                    <ListItemText primary={tag.name} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Collapse>

        <Stack spacing={2}>
          {filteredAndSortedSupplements.map((supplement) => (
            <Paper
              key={supplement.id}
              elevation={0}
              variant="outlined"
              sx={{
                p: 2,
                display: "flex",
                justifyContent: "space-between",
                opacity: supplement.hidden ? 0.5 : 1,
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    mb: 0.5,
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    component="h3"
                    sx={{ fontWeight: "medium", mr: 2 }}
                  >
                    {supplement.name}
                  </Typography>
                  {supplement.averageRating && (
                    <Chip
                      label={`${supplement.averageRating}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  )}
                  {!!supplement.ratingDifference && (
                    <Tooltip
                      title={`Разница в рейтинге между днями с добавкой и без неё: ${
                        supplement.ratingDifference > 0 ? "+" : ""
                      }${supplement.ratingDifference.toFixed(1)}`}
                    >
                      <Chip
                        label={
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <span style={{ marginRight: 4 }}>
                              {supplement.ratingDifference > 0 ? "↗" : "↘"}
                            </span>
                            <span>
                              {Math.abs(supplement.ratingDifference).toFixed(1)}
                            </span>
                          </Box>
                        }
                        size="small"
                        color={
                          supplement.ratingDifference > 0 ? "success" : "error"
                        }
                        variant="outlined"
                        sx={{ ml: 0.5 }}
                      />
                    </Tooltip>
                  )}
                </Box>
                {supplement.description && (
                  <Typography variant="body2" color="text.secondary">
                    {supplement.description}
                  </Typography>
                )}
                {supplement.tags && supplement.tags.length > 0 && (
                  <Box
                    sx={{
                      mt: 1,
                      display: "flex",
                      gap: 0.5,
                      flexWrap: "wrap",
                    }}
                  >
                    {supplement.tags.map((tag) => (
                      <Chip
                        key={tag.id}
                        label={tag.name}
                        size="small"
                        variant="outlined"
                        onClick={() => handleTagClick(tag.id)}
                        sx={{ cursor: "pointer" }}
                      />
                    ))}
                  </Box>
                )}
              </Box>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  ml: 2,
                }}
              >
                <Tooltip title="График оценок">
                  <IconButton
                    onClick={() => setChartSupplement(supplement)}
                    color="primary"
                    size="small"
                  >
                    <TimelineIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip
                  title={
                    supplement.hidden ? "Показать добавку" : "Скрыть добавку"
                  }
                >
                  <IconButton
                    onClick={() => handleToggleVisibility(supplement)}
                    color="default"
                    size="small"
                  >
                    {supplement.hidden ? (
                      <VisibilityOffIcon />
                    ) : (
                      <VisibilityIcon />
                    )}
                  </IconButton>
                </Tooltip>
                <IconButton
                  onClick={() => onEdit(supplement)}
                  color="primary"
                  size="small"
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  onClick={() => setDeleteConfirmId(supplement.id)}
                  color="error"
                  size="small"
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            </Paper>
          ))}
        </Stack>
      </CardContent>

      {/* Диалог подтверждения удаления */}
      <Dialog
        open={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
      >
        <DialogTitle>Подтверждение удаления</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Вы уверены, что хотите удалить эту добавку? Это действие нельзя
            отменить.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmId(null)}>Отмена</Button>
          <Button
            onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            color="error"
            variant="contained"
          >
            Удалить
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог с графиком */}
      <Dialog
        open={chartSupplement !== null}
        onClose={() => setChartSupplement(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>График оценок: {chartSupplement?.name}</DialogTitle>
        <DialogContent>
          {chartSupplement && (
            <SupplementChart
              supplementId={chartSupplement.id}
              supplementName={chartSupplement.name}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChartSupplement(null)}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
