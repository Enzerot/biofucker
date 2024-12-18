export interface Supplement {
  id: number;
  name: string;
  description: string | null;
  hidden: number;
  averageRating: number | null;
  ratingDifference: number | null;
  tags: Tag[];
}

export interface Tag {
  id: number;
  name: string;
}

export interface DailyEntry {
  id: number;
  date: number;
  rating: number;
  notes: string | null;
  supplements: {
    supplement: Supplement;
  }[];
}

export interface EditData {
  rating: number;
  notes: string;
  supplementIds: number[];
}
