import { InstructorWorkspace } from "@/features/instructor-workspace/instructor-workspace";
import { getInstructorWorkspace } from "@/lib/instructor-workspace";

export default function HomePage() {
  return <InstructorWorkspace workspace={getInstructorWorkspace()} />;
}
