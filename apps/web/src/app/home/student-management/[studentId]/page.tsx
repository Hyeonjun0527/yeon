import { StudentDetailScreen } from "@/features/student-management/screens/student-detail-screen";

export default function StudentDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  return <StudentDetailScreen paramsPromise={params} />;
}
