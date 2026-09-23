/** Pure — safe to import from client components (no server deps). */
export type Role = "pending" | "editor" | "admin";

export const ROLE_LABEL: Record<Role, string> = {
  pending: "待審核",
  editor: "編輯者",
  admin: "管理員",
};
