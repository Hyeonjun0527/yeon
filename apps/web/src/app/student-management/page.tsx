import { StudentManagementHome } from "@/features/student-management-home/student-management-home";
import { getContestOverview } from "@/lib/contest-overview";
import { getInstructorDashboard } from "@/lib/instructor-dashboard";

type Awaitable<T> = T | Promise<T>;

type StudentManagementPageProps = {
  searchParams?: Awaitable<Record<string, string | string[] | undefined>>;
};

function getScenarioParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default async function StudentManagementPage({
  searchParams,
}: StudentManagementPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  return (
    <StudentManagementHome
      overview={getContestOverview()}
      dashboard={getInstructorDashboard()}
      initialScenario={getScenarioParam(resolvedSearchParams?.scenario)}
    />
  );
}
