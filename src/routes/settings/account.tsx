import { createFileRoute } from "@tanstack/react-router";
import { AccountPage } from "../settings-pages";
export const Route = createFileRoute("/settings/account")({ component: AccountPage });
