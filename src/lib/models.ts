export type Status = "Aktuell" | "Prüfung erforderlich" | "Veraltet";
export type Section =
  "knowledge" | "templates" | "workshops" | "architecture" | "use-cases";
export interface BaseContent {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  technology: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  status: Status;
  sourceReference: string;
}
export interface Article extends BaseContent {
  kind: "knowledge";
  minutes: number;
}
export interface Template extends BaseContent {
  kind: "templates";
  fileType: string;
  download: string;
  snippet?: string;
}
export interface Workshop extends BaseContent {
  kind: "workshops";
  duration: string;
  audience: string;
  agenda: { title: string; minutes: number }[];
}
export interface Architecture extends BaseContent {
  kind: "architecture";
  integration: string;
  systems: string[];
}
export interface UseCase extends BaseContent {
  kind: "use-cases";
  industry: string;
  complexity: string;
  businessGoal: string;
}
export type Content = Article | Template | Workshop | Architecture | UseCase;
