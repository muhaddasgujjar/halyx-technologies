/**
 * The languages Halyx AI speaks.
 *
 * One registry, imported by both halves of the stack: the navbar switcher and
 * the console read the labels, the server reads `promptName` and `greeting` to
 * steer the model and Whisper. Keeping it in one file is what stops the two
 * sides drifting — a language the switcher offers but the prompt has never
 * heard of is a visitor picking Korean and being answered in English.
 *
 * Deliberately not a full i18n framework. The marketing page itself stays in
 * English; what gets translated is the handful of strings the *agent* says,
 * because the agent is the thing an international visitor actually talks to.
 * Translating the site copy is a content problem, not a code one, and reaching
 * for a message-catalogue library would only leave four hundred English strings
 * sitting behind German keys.
 */

export const DEFAULT_LOCALE = "en";

export interface Language {
  /** BCP-47 primary subtag. Also the localStorage value and the wire value. */
  code: string;
  /** Shown in the switcher. The language's own name, never the English one. */
  label: string;
  /** Secondary line in the switcher, for a visitor hunting an unfamiliar script. */
  english: string;
  /** Two-letter chip on the navbar button. */
  short: string;
  /** Full tag for `speechSynthesis` voice selection and `<html lang>`. */
  tag: string;
  dir: "ltr" | "rtl";
  /**
   * What the model is told to answer in. Spelled in English because the
   * instruction that carries it is itself written in English.
   */
  promptName: string;
  /**
   * The unprompted hello, spoken the moment the visitor reaches the console.
   *
   * Doubles as the Whisper priming sentence: it is a natural, correctly spelled
   * sentence in the language, which is exactly what the decoder needs to settle
   * on the right one from a short clip. Two jobs, one string, no drift.
   */
  /**
   * The unprompted hello, spoken the moment the console comes into view.
   *
   * Two clauses and no more, and the second one is a question about *them*.
   * "Welcome to Halyx AI, how can I help you today" — which is what these all
   * used to be — is the single most recognisable sentence a machine says: it
   * announces itself, offers nothing, and hands the visitor a blank page to
   * fill. Naming yourself and then asking what they are building opens the
   * conversation the studio actually wants and sounds like a person picking up
   * the phone.
   */
  greeting: string;
  ui: {
    /** Idle hint under the voice-agent button. */
    tapToTalk: string;
    /** Composer placeholder. */
    placeholder: string;
    /** The autoplay-refused affordance. */
    unmute: string;
    /** Shown before the first line of transcript. */
    empty: string;
    /** Accessible name for the navbar switcher. */
    language: string;
  };
}

/**
 * English first — it is the default and the switcher should not make a visitor
 * hunt for it. The rest are ordered by how many visitors are likely to arrive
 * speaking them, not alphabetically: an alphabetical list buries Chinese.
 */
export const LANGUAGES: Language[] = [
  {
    code: "en",
    label: "English",
    english: "English",
    short: "EN",
    tag: "en-GB",
    dir: "ltr",
    promptName: "English",
    greeting: "Hi — Halyx AI here. What are you working on?",
    ui: {
      tapToTalk: "Tap to talk",
      placeholder: "Type a question…",
      unmute: "Tap to hear Halyx AI",
      empty:
        "It says hello on its own. Tap the voice agent to talk back, or type below — it answers the same either way.",
      language: "Language",
    },
  },
  {
    code: "de",
    label: "Deutsch",
    english: "German",
    short: "DE",
    tag: "de-DE",
    dir: "ltr",
    promptName: "German",
    greeting: "Hallo, hier ist Halyx AI. Woran arbeiten Sie gerade?",
    ui: {
      tapToTalk: "Zum Sprechen tippen",
      placeholder: "Frage eingeben…",
      unmute: "Tippen, um Halyx AI zu hören",
      empty:
        "Es begrüßt Sie von selbst. Tippen Sie auf den Sprachagenten, um zu antworten, oder schreiben Sie unten — die Antwort ist dieselbe.",
      language: "Sprache",
    },
  },
  {
    code: "fr",
    label: "Français",
    english: "French",
    short: "FR",
    tag: "fr-FR",
    dir: "ltr",
    promptName: "French",
    greeting: "Bonjour, ici Halyx AI. Sur quoi travaillez-vous en ce moment ?",
    ui: {
      tapToTalk: "Touchez pour parler",
      placeholder: "Posez une question…",
      unmute: "Touchez pour entendre Halyx AI",
      empty:
        "Il vous salue de lui-même. Touchez l’agent vocal pour répondre, ou écrivez ci-dessous — la réponse est la même.",
      language: "Langue",
    },
  },
  {
    code: "es",
    label: "Español",
    english: "Spanish",
    short: "ES",
    tag: "es-ES",
    dir: "ltr",
    promptName: "Spanish",
    greeting: "Hola, soy Halyx AI. ¿En qué está trabajando?",
    ui: {
      tapToTalk: "Toca para hablar",
      placeholder: "Escribe una pregunta…",
      unmute: "Toca para escuchar a Halyx AI",
      empty:
        "Saluda por su cuenta. Toca el agente de voz para responder, o escribe abajo — la respuesta es la misma.",
      language: "Idioma",
    },
  },
  {
    code: "pt",
    label: "Português",
    english: "Portuguese",
    short: "PT",
    tag: "pt-BR",
    dir: "ltr",
    promptName: "Portuguese",
    greeting: "Olá, aqui é a Halyx AI. Em que está a trabalhar?",
    ui: {
      tapToTalk: "Toque para falar",
      placeholder: "Escreva uma pergunta…",
      unmute: "Toque para ouvir a Halyx AI",
      empty:
        "Ela cumprimenta por conta própria. Toque no agente de voz para responder, ou escreva abaixo — a resposta é a mesma.",
      language: "Idioma",
    },
  },
  {
    code: "it",
    label: "Italiano",
    english: "Italian",
    short: "IT",
    tag: "it-IT",
    dir: "ltr",
    promptName: "Italian",
    greeting: "Salve, sono Halyx AI. A cosa sta lavorando?",
    ui: {
      tapToTalk: "Tocca per parlare",
      placeholder: "Scrivi una domanda…",
      unmute: "Tocca per ascoltare Halyx AI",
      empty:
        "Ti saluta da solo. Tocca l’agente vocale per rispondere, o scrivi qui sotto — la risposta è la stessa.",
      language: "Lingua",
    },
  },
  {
    code: "nl",
    label: "Nederlands",
    english: "Dutch",
    short: "NL",
    tag: "nl-NL",
    dir: "ltr",
    promptName: "Dutch",
    greeting: "Hoi, dit is Halyx AI. Waar werk je aan?",
    ui: {
      tapToTalk: "Tik om te praten",
      placeholder: "Stel een vraag…",
      unmute: "Tik om Halyx AI te horen",
      empty:
        "Het begroet u uit zichzelf. Tik op de spraakagent om te antwoorden, of typ hieronder — het antwoord is hetzelfde.",
      language: "Taal",
    },
  },
  {
    code: "tr",
    label: "Türkçe",
    english: "Turkish",
    short: "TR",
    tag: "tr-TR",
    dir: "ltr",
    promptName: "Turkish",
    greeting: "Merhaba, ben Halyx AI. Ne üzerinde çalışıyorsunuz?",
    ui: {
      tapToTalk: "Konuşmak için dokunun",
      placeholder: "Bir soru yazın…",
      unmute: "Halyx AI’yı duymak için dokunun",
      empty:
        "Sizi kendiliğinden selamlar. Yanıt vermek için sesli asistana dokunun ya da aşağıya yazın — cevap aynıdır.",
      language: "Dil",
    },
  },
  {
    code: "ru",
    label: "Русский",
    english: "Russian",
    short: "RU",
    tag: "ru-RU",
    dir: "ltr",
    promptName: "Russian",
    greeting:
      "Здравствуйте, это Halyx AI. Над чем вы сейчас работаете?",
    ui: {
      tapToTalk:
        "Нажмите, чтобы говорить",
      placeholder: "Задайте вопрос…",
      unmute:
        "Нажмите, чтобы услышать Halyx AI",
      empty:
        "Он здоровается сам. Нажмите на голосового агента, чтобы ответить, или напишите ниже — ответ будет тот же.",
      language: "Язык",
    },
  },
  {
    code: "zh",
    label: "中文",
    english: "Chinese",
    short: "ZH",
    tag: "zh-CN",
    dir: "ltr",
    promptName: "Chinese (simplified)",
    greeting:
      "你好，我是 Halyx AI。你在做什么项目？",
    ui: {
      tapToTalk: "点击开始说话",
      placeholder: "输入问题…",
      unmute: "点击收听 Halyx AI",
      empty:
        "它会主动打招呼。点击语音助手与它对话，或在下方输入——回答都一样。",
      language: "语言",
    },
  },
  {
    code: "ja",
    label: "日本語",
    english: "Japanese",
    short: "JA",
    tag: "ja-JP",
    dir: "ltr",
    promptName: "Japanese",
    greeting:
      "こんにちは、Halyx AI です。今どんなものを作っていますか？",
    ui: {
      tapToTalk: "タップして話しかけてください",
      placeholder: "質問を入力…",
      unmute: "タップして Halyx AI を聞く",
      empty:
        "こちらから先に話しかけます。音声エージェントをタップするか、下に入力してください。どちらでも同じように答えます。",
      language: "言語",
    },
  },
  {
    code: "ko",
    label: "한국어",
    english: "Korean",
    short: "KO",
    tag: "ko-KR",
    dir: "ltr",
    promptName: "Korean",
    greeting:
      "안녕하세요, Halyx AI입니다. 어떤 걸 만들고 계세요?",
    ui: {
      tapToTalk: "탭하여 말하기",
      placeholder: "질문을 입력하세요…",
      unmute: "탭하여 Halyx AI 듣기",
      empty:
        "먼저 인사를 건넵니다. 음성 에이전트를 탭하거나 아래에 입력하세요 — 답변은 같습니다.",
      language: "언어",
    },
  },
  {
    code: "ar",
    label: "العربية",
    english: "Arabic",
    short: "AR",
    tag: "ar-SA",
    dir: "rtl",
    promptName: "Arabic",
    greeting:
      "أهلًا، أنا هاليكس. على ماذا تعمل حاليًا؟",
    ui: {
      tapToTalk: "اضغط للتحدث",
      placeholder: "اكتب سؤالًا…",
      unmute: "اضغط للاستماع إلى Halyx AI",
      empty:
        "يبدأ بالترحيب بك من تلقاء نفسه. اضغط على الوكيل الصوتي للرد، أو اكتب في الأسفل — الإجابة واحدة.",
      language: "اللغة",
    },
  },
  {
    code: "ur",
    label: "اردو",
    english: "Urdu",
    short: "UR",
    tag: "ur-PK",
    dir: "rtl",
    promptName: "Urdu",
    greeting:
      "ہیلو، میں ہیلیکس اے آئی ہوں۔ آپ آج کل کس چیز پر کام کر رہے ہیں؟",
    ui: {
      tapToTalk:
        "بات کرنے کے لیے ٹیپ کریں",
      placeholder: "سوال لکھیے…",
      unmute:
        "ہیلیکس اے آئی سننے کے لیے ٹیپ کریں",
      empty:
        "یہ خود ہی سلام کرتا ہے۔ جواب دینے کے لیے وائس ایجنٹ پر ٹیپ کریں، یا نیچے لکھیں — جواب دونوں صورتوں میں ایک جیسا ہے۔",
      language: "زبان",
    },
  },
  {
    code: "hi",
    label: "हिन्दी",
    english: "Hindi",
    short: "HI",
    tag: "hi-IN",
    dir: "ltr",
    promptName: "Hindi",
    greeting:
      "नमस्ते, मैं हैलिक्स एआई हूँ। आप किस चीज़ पर काम कर रहे हैं?",
    ui: {
      tapToTalk:
        "बात करने के लिए टैप करें",
      placeholder: "प्रश्न लिखें…",
      unmute: "Halyx AI सुनने के लिए टैप करें",
      empty:
        "यह ख़ुद ही अभिवादन करता है। जवाब देने के लिए वॉइस एजेंट पर टैप करें, या नीचे लिखें — उत्तर दोनों तरह से एक जैसा है।",
      language: "भाषा",
    },
  },
];

const BY_CODE = new Map(LANGUAGES.map((l) => [l.code, l]));

export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code);

/** True for a code the registry actually knows. Use before trusting client input. */
export function isLanguageCode(value: unknown): value is string {
  return typeof value === "string" && BY_CODE.has(value);
}

/**
 * Resolves a code to its entry, falling back to English.
 *
 * Never throws and never returns undefined: every call site — the switcher, the
 * greeting, the prompt builder — needs *a* language, and an unknown code is a
 * stale localStorage value or a hand-rolled request, not a reason to break the
 * page.
 */
export function language(code: string | null | undefined): Language {
  return (code ? BY_CODE.get(code) : undefined) ?? BY_CODE.get(DEFAULT_LOCALE)!;
}

export const ENGLISH = language(DEFAULT_LOCALE);
