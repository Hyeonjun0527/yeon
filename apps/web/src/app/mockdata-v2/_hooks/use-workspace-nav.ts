import { useState } from "react";

export type ActiveMenu = "records" | "students" | "tasks" | "reports";

export function useWorkspaceNav() {
  const [activeMenu, setActiveMenu] = useState<ActiveMenu>("records");
  return { activeMenu, setActiveMenu } as const;
}
