import { createFileRoute, Navigate } from "@tanstack/react-router";
export const Route = createFileRoute("/pt-br/login")({ component: () => <Navigate to="/login" replace /> });
