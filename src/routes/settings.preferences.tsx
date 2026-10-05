import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePreferencesPage } from "./settings-pages";

export const Route = createFileRoute("/settings/preferences")({
  component: WorkspacePreferencesPage,
});
