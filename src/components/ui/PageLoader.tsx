import { LoadingIndicator } from "./loading-indicator";

export default function PageLoader() {
  return (
    <div className="flex h-full items-center justify-center bg-gray-50">
      <LoadingIndicator variant="page" label="Loading..." />
    </div>
  );
}
