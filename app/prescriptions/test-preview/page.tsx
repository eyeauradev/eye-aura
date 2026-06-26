// Server component — evaluated at build/request time on the server.
// notFound() here produces a real 404 with no client bundle shipped in production.
import { notFound } from "next/navigation";
import { TestPreviewContent } from "./TestPreviewContent";

export default function TestPrescriptionPreviewPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return <TestPreviewContent />;
}
