/* =========================================================
   CONFIGURAÇÃO DO LEITOR
   ========================================================= */

type VoiceGender = "male" | "female";

const [speechGender, setSpeechGender] =
  useState<VoiceGender>("male");

const [readingMessageId, setReadingMessageId] =
  useState<string | null>(null);

const [readingCharIndex, setReadingCharIndex] =
  useState(-1);

const [speechLanguage, setSpeechLanguage] =
  useState("pt-BR");

const [availableVoices, setAvailableVoices] =
  useState<SpeechSynthesisVoice[]>([]);

const speechRef =
  useRef<SpeechSynthesisUtterance | null>(null);

const speechSessionRef =
  useRef(0);


/* =========================================================
   CARREGAR VOZES
   ========================================================= */

useEffect(() => {
  if (
    typeof window === "undefined" ||
    !("speechSynthesis" in window)
  ) {
    return;
  }

  const loadVoices = () => {
    const voices =
      window.speechSynthesis.getVoices();

    setAvailableVoices(voices);
  };

  loadVoices();

  window.speechSynthesis.addEventListener(
    "voiceschanged",
    loadVoices,
  );

  return () => {
    window.speechSynthesis.removeEventListener(
      "voiceschanged",
      loadVoices,
    );
  };
}, []);


/* =========================================================
   ENCONTRAR VOZ
   ========================================================= */

const findBestVoice = useCallback(
  (
    language: string,
    gender: VoiceGender,
  ) => {
    const languagePrefix =
      language
        .split("-")[0]
        .toLowerCase();

    const voices =
      availableVoices.filter(
        (voice) =>
          voice.lang
            .toLowerCase()
            .startsWith(
              languagePrefix,
            ),
      );

    if (voices.length === 0) {
      return undefined;
    }

    const femaleKeywords = [
      "female",
      "femin",
      "woman",
      "women",
      "girl",
      "woman voice",
      "female voice",
      "mulher",
      "feminina",
      "femme",
      "mujer",
    ];

    const maleKeywords = [
      "male",
      "mascul",
      "man",
      "guy",
      "boy",
      "male voice",
      "homem",
      "masculina",
      "homme",
      "hombre",
    ];

    const keywords =
      gender === "female"
        ? femaleKeywords
        : maleKeywords;

    /*
     * Primeiro tenta encontrar uma voz
     * explicitamente identificada pelo nome.
     */
    const genderVoice =
      voices.find((voice) => {
        const name =
          voice.name.toLowerCase();

        return keywords.some(
          (keyword) =>
            name.includes(keyword),
        );
      });

    if (genderVoice) {
      return genderVoice;
    }

    /*
     * Algumas vozes não colocam "male"
     * ou "female" no nome.
     *
     * Neste caso, tenta algumas vozes
     * conhecidas pelo sistema.
     */
    const preferredNames =
      gender === "female"
        ? [
            "Samantha",
            "Karen",
            "Moira",
            "Google US English",
          ]
        : [
            "Daniel",
            "Alex",
            "Google US English",
          ];

    const preferredVoice =
      voices.find((voice) =>
        preferredNames.some(
          (name) =>
            voice.name
              .toLowerCase()
              .includes(
                name.toLowerCase(),
              ),
        ),
      );

    return (
      preferredVoice ??
      voices[0]
    );
  },
  [availableVoices],
);


/* =========================================================
   PARAR LEITURA
   ========================================================= */

const stopReading =
  useCallback(() => {
    /*
     * Invalida qualquer leitura anterior.
     */
    speechSessionRef.current += 1;

    if (
      typeof window !==
      "undefined" &&
      "speechSynthesis" in window
    ) {
      window.speechSynthesis.cancel();
    }

    speechRef.current = null;

    setReadingMessageId(null);
    setReadingCharIndex(-1);
  }, []);


/* =========================================================
   LER MENSAGEM
   ========================================================= */

const readMessage =
  useCallback(
    (message: ChatMessage) => {
      if (
        typeof window ===
          "undefined" ||
        !(
          "speechSynthesis" in
          window
        )
      ) {
        setErrorMessage(
          "A leitura de texto não é compatível com este navegador.",
        );

        return;
      }

      /*
       * Se já está lendo essa mensagem,
       * o clique para a leitura.
       */
      if (
        readingMessageId ===
        message.id
      ) {
        stopReading();
        return;
      }

      /*
       * MUITO IMPORTANTE:
       * cancela absolutamente tudo antes
       * de criar uma nova fala.
       *
       * Isso evita:
       *
       * clique → nada
       * clique → fala
       * clique → fala novamente
       *
       * e evita fila de utterances.
       */
      window.speechSynthesis.cancel();

      speechSessionRef.current += 1;

      const session =
        speechSessionRef.current;

      setReadingMessageId(
        message.id,
      );

      setReadingCharIndex(0);

      const utterance =
        new SpeechSynthesisUtterance(
          message.content,
        );

      /*
       * Velocidade confortável e rápida.
       */
      utterance.rate = 1.15;

      utterance.pitch = 1;

      utterance.volume = 1;

      utterance.lang =
        speechLanguage;

      /*
       * Escolhe masculina ou feminina.
       */
      const voice =
        findBestVoice(
          speechLanguage,
          speechGender,
        );

      if (voice) {
        utterance.voice = voice;
        utterance.lang =
          voice.lang;
      }

      /*
       * Destaca a palavra atual.
       */
      utterance.onboundary =
        (event) => {
          if (
            speechSessionRef.current !==
            session
          ) {
            return;
          }

          if (
            event.name === "word" &&
            typeof event.charIndex ===
              "number"
          ) {
            setReadingCharIndex(
              event.charIndex,
            );
          }
        };

      utterance.onstart =
        () => {
          if (
            speechSessionRef.current !==
            session
          ) {
            return;
          }

          setReadingMessageId(
            message.id,
          );
        };

      utterance.onend =
        () => {
          if (
            speechSessionRef.current !==
            session
          ) {
            return;
          }

          speechRef.current =
            null;

          setReadingMessageId(
            null,
          );

          setReadingCharIndex(
            -1,
          );
        };

      utterance.onerror =
        (event) => {
          if (
            speechSessionRef.current !==
            session
          ) {
            return;
          }

          /*
           * "canceled" e "interrupted"
           * acontecem normalmente quando
           * o usuário para a leitura.
           */
          if (
            event.error ===
              "canceled" ||
            event.error ===
              "interrupted"
          ) {
            return;
          }

          speechRef.current =
            null;

          setReadingMessageId(
            null,
          );

          setReadingCharIndex(
            -1,
          );
        };

      speechRef.current =
        utterance;

      /*
       * Alguns celulares precisam que
       * a fila seja esvaziada antes do speak.
       */
      window.speechSynthesis.cancel();

      /*
       * O primeiro clique já chama speak().
       */
      window.speechSynthesis.speak(
        utterance,
      );
    },
    [
      readingMessageId,
      speechLanguage,
      speechGender,
      findBestVoice,
      stopReading,
    ],
  );


/* =========================================================
   LIMPAR AO SAIR DA PÁGINA
   ========================================================= */

useEffect(() => {
  return () => {
    speechSessionRef.current += 1;

    if (
      typeof window !==
      "undefined" &&
      "speechSynthesis" in window
    ) {
      window.speechSynthesis.cancel();
    }
  };
}, []);