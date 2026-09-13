import { createFileRoute, Navigate } from "@tanstack/react-router";
export const Route = createFileRoute("/pt-br/workspace")({ component: () => <Navigate to="/workspace" replace /> });
