import { redirect } from "next/navigation";

import { CardServiceHome } from "@/features/card-service";
import { getCurrentAuthUser } from "@/server/auth/session";

export default async function CardServicePage() {
  const user = await getCurrentAuthUser();
  if (!user) {
    redirect("/?next=%2Fcard-service");
  }
  return <CardServiceHome />;
}
