/**
 * /dashboard/ai-interview is now merged into /dashboard/assessments.
 * This redirect keeps any bookmarked or externally-linked URLs working.
 */
import { redirect } from "next/navigation";

export default function AiInterviewRedirect() {
  redirect("/dashboard/assessments");
}
