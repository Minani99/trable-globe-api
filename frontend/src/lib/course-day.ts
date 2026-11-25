export const COMPANIONS = ["혼자", "연인과", "친구와", "가족과", "아이와", "부모님과"] as const;

// PlanBuilder previously saved the companion in its generated introduction.
export function courseCompanion(description?: string | null) {
  return COMPANIONS.find(value => description?.startsWith(value + " 떠나는 ")) ?? "";
}
