import { createFileRoute, Navigate } from "@tanstack/react-router";
export const Route = createFileRoute("/pt-br/credits")({ component: () => <Navigate to="/credits" replace /> });
