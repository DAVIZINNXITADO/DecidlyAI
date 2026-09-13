import { createFileRoute } from "@tanstack/react-router";
import { BuyPage } from "../credit-pages";
export const Route = createFileRoute("/credits/buy")({ component: BuyPage });
