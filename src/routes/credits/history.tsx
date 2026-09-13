import { createFileRoute } from "@tanstack/react-router";
import { HistoryPage } from "../credit-pages";
export const Route = createFileRoute("/credits/history")({ component: HistoryPage });
