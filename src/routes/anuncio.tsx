import { createFileRoute } from "@tanstack/react-router";
import { SponsoredRewardPage } from "./credits/sponsored";

export const Route = createFileRoute("/anuncio")({ component: SponsoredRewardPage });
