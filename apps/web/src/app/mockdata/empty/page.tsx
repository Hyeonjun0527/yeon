import { redirect } from "next/navigation";

export default function MockdataEmptyRedirectPage() {
  redirect("/mockdata/app");
}
