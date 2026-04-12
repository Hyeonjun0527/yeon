import { redirect } from "next/navigation";

export default function MockdataStudentsRedirectPage() {
  redirect("/mockdata/app/student-management");
}
