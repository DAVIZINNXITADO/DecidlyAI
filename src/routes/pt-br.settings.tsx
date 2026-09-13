import { createFileRoute, Navigate } from "@tanstack/react-router";
export const Route = createFileRoute("/pt-br/settings")({ component: () => <Navigate to="/settings" replace /> });
