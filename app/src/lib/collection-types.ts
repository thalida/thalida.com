import type { NavItem } from "./nav-data";

export interface CollectionPage {
  data: NavItem[];
  start: number;
  end: number;
  total: number;
  currentPage: number;
  lastPage: number;
  size: number;
  url: { current: string; prev: string | undefined; next: string | undefined };
}

export interface CollectionPageProps {
  title: string;
  allCategories: string[];
  allSubcategories: Record<string, string[]>;
}
