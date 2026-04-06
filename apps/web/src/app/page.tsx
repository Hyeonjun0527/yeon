import { ContestHome } from "@/features/contest-home/contest-home";
import { getContestOverview } from "@/lib/contest-overview";
import { getInstructorDashboard } from "@/lib/instructor-dashboard";

export default function HomePage() {
  return (
    <ContestHome
      overview={getContestOverview()}
      dashboard={getInstructorDashboard()}
    />
  );
}
