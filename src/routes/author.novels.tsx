import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/author/novels")({
  component: () => <Navigate to="/author/dashboard" />,
});
