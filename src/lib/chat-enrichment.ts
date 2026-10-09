export type AnalyticsTopic =
  | "work_and_study"
  | "business_and_technology"
  | "decision_and_planning"
  | "creative_and_media"
  | "sports"
  | "other";

export type PhotoTopic = "running" | "travel" | "nature" | "food" | "architecture";

export type UnsplashPhoto = {
  url: string;
  alt: string;
  photographer: string;
  photographerProfile: string;
};

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export function stripUntrustedAddonMarkup(value: string): string {
  const clean = value.replace(
    /\[(unsplash_photo|context_card)(?:\s+[^\]]*)?\][\s\S]*?\[\/\1\]/gi,
    "",
  );
  const strayMarker = clean.search(/\[(?:unsplash_photo|context_card)\b/i);
  return strayMarker >= 0 ? clean.slice(0, strayMarker).trimEnd() : clean;
}

export function classifyChatTopic(text: string): AnalyticsTopic {
  const value = normalize(text);
  if (/\b(corrida|correr|corredor|treino|atletismo|pista de corrida)\b/.test(value))
    return "sports";
  if (/\b(faculdade|escola|estudo|estudar|prova|trabalho|carreira|emprego|curriculo)\b/.test(value))
    return "work_and_study";
  if (
    /\b(monetiz|anuncio|anuncios|publicidade|adsterra|site|aplicativo|app|tecnologia|programacao|codigo)\b/.test(
      value,
    )
  )
    return "business_and_technology";
  if (/\b(texto|redacao|historia|conto|imagem|foto|design|criativo|video|musica)\b/.test(value))
    return "creative_and_media";
  if (
    /\b(decisao|decidir|escolha|opcao|opcoes|comparar|planejar|planejamento|prioridade)\b/.test(
      value,
    )
  )
    return "decision_and_planning";
  return "other";
}

export function getPhotoTopic(text: string): PhotoTopic | null {
  const value = normalize(text);
  if (
    /\b(corrida|correr|corredor|treino de velocidade|atletismo|pista de corrida|aquecimento)\b/.test(
      value,
    )
  )
    return "running";
  if (/\b(viagem|viajar|turismo|destino|roteiro|paisagem de viagem)\b/.test(value)) return "travel";
  if (/\b(natureza|praia|montanha|floresta|cachoeira|paisagem)\b/.test(value)) return "nature";
  if (/\b(receita|cozinhar|culinaria|comida|prato|ingrediente)\b/.test(value)) return "food";
  if (/\b(arquitetura|decoracao|reforma|interiores|design de casa)\b/.test(value))
    return "architecture";
  return null;
}

export function shouldRecommendAdsterra(text: string): boolean {
  const value = normalize(text);
  return (
    /\b(adsterra|monetiz\w*|publicidade|anuncio(?:s)?)\b/.test(value) &&
    /\b(site|blog|pagina|plataforma|app|aplicativo|internet|monetiz\w*|publicidade|anuncio(?:s)?|ads)\b/.test(
      value,
    )
  );
}

function encodeAttribute(value: string): string {
  return encodeURIComponent(value);
}

export function makeUnsplashMarkup(photo: UnsplashPhoto): string {
  let url: URL;
  let profile: URL;
  try {
    url = new URL(photo.url);
    profile = new URL(photo.photographerProfile);
  } catch {
    return "";
  }
  if (url.protocol !== "https:" || url.hostname !== "images.unsplash.com") return "";
  if (
    profile.protocol !== "https:" ||
    !["unsplash.com", "www.unsplash.com"].includes(profile.hostname)
  )
    return "";
  profile.searchParams.set("utm_source", "decidlyai");
  profile.searchParams.set("utm_medium", "referral");

  return [
    "[unsplash_photo",
    `src="${encodeAttribute(photo.url)}"`,
    `alt="${encodeAttribute(photo.alt.slice(0, 240))}"`,
    `photographer="${encodeAttribute(photo.photographer.slice(0, 120))}"`,
    `profile="${encodeAttribute(profile.toString())}"`,
    "][/unsplash_photo]",
  ].join(" ");
}

export function makeAdsterraRecommendationMarkup(): string {
  const title = "Uma opção para pesquisar: Adsterra";
  const href = "https://beta.publishers.adsterra.com/referral/x6d9mBbDWJ";
  const description =
    "Se você está avaliando monetizar seu site com publicidade, pode comparar o Adsterra com outras redes e conferir as regras, formatos e requisitos antes de instalar qualquer banner. Este é um link de indicação do DecidlyAI; eventual benefício depende das regras da plataforma.";
  return `[context_card title="${encodeAttribute(title)}" href="${encodeAttribute(href)}" cta="${encodeAttribute("Ver Adsterra")}"]${description}[/context_card]`;
}
