"use client";

import { deleteSupplement, toggleSupplementVisibility } from "../actions";
import { useState, useMemo } from "react";
import { Supplement } from "../types";
import { useNotification } from "../contexts/NotificationContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Search,
  X,
  LineChart,
  Plus,
  Filter,
} from "lucide-react";
import SupplementChart from "./SupplementChart";
import { Checkbox } from "@/components/ui/checkbox";

interface SupplementStatsProps {
  supplements: Supplement[];
  onSuccess: () => void;
  onEdit: (supplement: Supplement) => void;
  onAdd: () => void;
}

export default function SupplementStats({
  supplements,
  onSuccess,
  onEdit,
  onAdd,
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
        supplement.hidden ? "Добавка показана" : "Добавка скрыта"
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
            (b.rating_difference ?? 0) - (a.rating_difference ?? 0) ||
            a.name.localeCompare(b.name)
          );
        case "difference_asc":
          return (
            (a.rating_difference ?? 0) - (b.rating_difference ?? 0) ||
            a.name.localeCompare(b.name)
          );
        case "rating":
          return (
            (b.average_rating ?? 0) - (a.average_rating ?? 0) ||
            a.name.localeCompare(b.name)
          );
        case "rating_asc":
          return (
            (a.average_rating ?? 0) - (b.average_rating ?? 0) ||
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
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4 mb-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Список добавок</h2>
            <div className="flex gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={onAdd} variant="outline" size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Добавить добавку</p>
                </TooltipContent>
              </Tooltip>
              {(searchQuery ||
                selectedTags.length > 0 ||
                sortType !== "difference") && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleClearFilters}
                      variant="outline"
                      size="icon"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Очистить фильтры</p>
                  </TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => setShowFilters(!showFilters)}
                    variant="outline"
                    size="icon"
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Фильтры и сортировка</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по названию, тегам или описанию"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        {showFilters && (
          <div className="mb-6 space-y-4">
            <div className="space-y-2">
              <Label>Сортировка</Label>
              <Select
                value={sortType}
                onChange={(e) => setSortType(e.target.value)}
              >
                <option value="rating">По рейтингу (↓)</option>
                <option value="rating_asc">По рейтингу (↑)</option>
                <option value="difference">По разнице (↓)</option>
                <option value="difference_asc">По разнице (↑)</option>
                <option value="name">По названию (А-Я)</option>
                <option value="name_desc">По названию (Я-А)</option>
                <option value="tags">По количеству тегов (↓)</option>
                <option value="tags_asc">По количеству тегов (↑)</option>
              </Select>
            </div>

            {allTags.length > 0 && (
              <div className="space-y-2">
                <Label>Фильтр по тегам</Label>
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag) => {
                    const isSelected = selectedTags.includes(tag.id);
                    return (
                      <div
                        key={tag.id}
                        className="flex items-center gap-2 border rounded-md px-3 py-2"
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedTags([...selectedTags, tag.id]);
                            } else {
                              setSelectedTags(
                                selectedTags.filter((id) => id !== tag.id)
                              );
                            }
                          }}
                        />
                        <Label className="cursor-pointer">{tag.name}</Label>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-4">
          {filteredAndSortedSupplements.map((supplement) => (
            <div
              key={supplement.id}
              className={`border rounded-lg p-4 flex justify-between ${
                supplement.hidden ? "opacity-50" : ""
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-medium">{supplement.name}</h3>
                  {supplement.average_rating && (
                    <Badge variant="outline">{supplement.average_rating}</Badge>
                  )}
                  {!!supplement.rating_difference && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Badge
                            variant={
                              supplement.rating_difference > 0
                                ? "default"
                                : "destructive"
                            }
                          >
                            {supplement.rating_difference > 0 ? "↗" : "↘"}{" "}
                            {Math.abs(supplement.rating_difference).toFixed(1)}
                          </Badge>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          Разница в рейтинге между днями с добавкой и без неё:{" "}
                          {supplement.rating_difference > 0 ? "+" : ""}
                          {supplement.rating_difference.toFixed(1)}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                {supplement.description && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {supplement.description}
                  </p>
                )}
                {supplement.tags && supplement.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {supplement.tags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => handleTagClick(tag.id)}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 ml-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => setChartSupplement(supplement)}
                      variant="ghost"
                      size="icon"
                    >
                      <LineChart className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>График оценок</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => handleToggleVisibility(supplement)}
                      variant="ghost"
                      size="icon"
                    >
                      {supplement.hidden ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {supplement.hidden
                        ? "Показать добавку"
                        : "Скрыть добавку"}
                    </p>
                  </TooltipContent>
                </Tooltip>
                <Button
                  onClick={() => onEdit(supplement)}
                  variant="ghost"
                  size="icon"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => setDeleteConfirmId(supplement.id)}
                  variant="ghost"
                  size="icon"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Подтверждение удаления</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить эту добавку? Это действие нельзя
              отменить.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Отмена
            </Button>
            <Button
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              variant="destructive"
            >
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={chartSupplement !== null}
        onOpenChange={(open) => !open && setChartSupplement(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>График оценок: {chartSupplement?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {chartSupplement && (
              <SupplementChart
                supplementId={chartSupplement.id}
                supplementName={chartSupplement.name}
              />
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setChartSupplement(null)}>Закрыть</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
