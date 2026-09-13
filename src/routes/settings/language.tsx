import { createFileRoute } from "@tanstack/react-router";
import { LanguagePage } from "../settings-pages";
export const Route = createFileRoute("/settings/language")({ component: LanguagePage });
