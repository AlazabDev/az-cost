/** Arabic labels for domain enums stored in the database. */

export const CATEGORY_LABELS: Record<string, string> = {
  iron: "حديد",
  cement: "أسمنت",
  labor: "عمالة",
  transport: "نقل",
  equipment: "معدات",
  materials: "خامات",
  other: "أخرى",
};

export const CATEGORY_KEYS = Object.keys(CATEGORY_LABELS);

export const DIRECTION_LABELS: Record<string, string> = {
  expense: "مصروف",
  payment_received: "دفعة مستلمة",
};

export const PROJECT_TYPE_LABELS: Record<string, string> = {
  construction: "بناء",
  finishing: "تشطيبات",
  other: "أخرى",
};

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  active: "نشط",
  completed: "مكتمل",
};

export const categoryLabel = (key: string) => CATEGORY_LABELS[key] ?? key;
export const directionLabel = (key: string) => DIRECTION_LABELS[key] ?? key;
export const projectTypeLabel = (key: string) => PROJECT_TYPE_LABELS[key] ?? key;
export const projectStatusLabel = (key: string) => PROJECT_STATUS_LABELS[key] ?? key;
