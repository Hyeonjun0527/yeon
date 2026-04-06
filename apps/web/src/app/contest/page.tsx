import { ContestHome } from "@/features/contest-home/contest-home";
import { getContestOverview } from "@/lib/contest-overview";
import { getInstructorDashboard } from "@/lib/instructor-dashboard";

export default function ContestPage() {
  return (
    <ContestHome
      overview={getContestOverview()}
      dashboard={getInstructorDashboard()}
    />
  );
}
