import { LoadingIndicator } from "./loading-indicator";

export default function PageLoader() {
  return (
    <div className="flex h-full items-center justify-center bg-muted">
      <LoadingIndicator variant="page" label="Loading..." />
    </div>
  );
}
