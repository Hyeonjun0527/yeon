import { InstructorWorkspace } from "@/features/instructor-workspace/instructor-workspace";
import { getInstructorDashboard } from "@/lib/instructor-dashboard";
import { getInstructorWorkspace } from "@/lib/instructor-workspace";

export default function HomePage() {
  return (
    <InstructorWorkspace
      dashboard={getInstructorDashboard()}
      workspace={getInstructorWorkspace()}
    />
  );
}
