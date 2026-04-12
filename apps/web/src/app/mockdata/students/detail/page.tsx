import { redirect } from "next/navigation";

export default function MockdataStudentDetailRedirectPage() {
  redirect("/mockdata/app/student-management/s1?spaceId=space-7");
}
