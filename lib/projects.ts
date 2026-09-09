export type Fact = readonly [label: string, value: string];

export interface Project {
  name: string;
  cat: string;
  url: string;
  host: string;
  img: string;
  note: string;
  tags: string[];
  problem: string;
  solution: string;
  facts: Fact[];
}

/** Real client work. Copy is verbatim from the design reference. */
export const PROJECTS: Project[] = [
  {
    name: "Maiku AI",
    cat: "Real-time interview copilot",
    url: "https://maiku.app/",
    host: "maiku.app",
    img: "/media/case-maiku.png",
    note: "Invisible during screen share",
    tags: ["Realtime AI", "Desktop", "Groq"],
    problem:
      "Candidates rehearse technical interviews alone and lose structure under live pressure. Any helper window is useless the moment the call is being shared, because it shows up in the captured frame.",
    solution:
      "A desktop overlay that transcribes the interview live with Groq Whisper and drafts structured answers with LLaMA while the call runs on Zoom, Meet or Teams. The window is registered with the Windows Display Affinity API, so it is physically absent from captured frames rather than hidden behind another window. Core is open source and runs on the user's own Groq key.",
    facts: [
      ["Groq Whisper", "Live transcription"],
      ["LLaMA", "Answer drafting"],
      ["WDA_EXCLUDEFROMCAPTURE", "Absent from capture"],
      ["Zoom / Meet / Teams", "Call surfaces"],
    ],
  },
  {
    name: "ArchitectXpert",
    cat: "AI floor plan generator",
    url: "https://architectxpert.tech/",
    host: "architectxpert.tech",
    img: "/media/case-architectxpert.png",
    note: "Naqsha in one pass, DXF out",
    tags: ["Generative design", "CAD export", "Web app"],
    problem:
      "Getting a first floor plan drawn means waiting on a draughtsman for days, and homeowners rarely have the vocabulary to brief one. Plot size, bedroom count and city rules all have to be translated by hand before anything can be drawn.",
    solution:
      "A generator that takes plot size, floors, bedroom and bathroom counts, city and house style, then produces a dimensioned architectural plan with room labels, door placements and a total area breakdown. Output downloads as PNG or DXF for AutoCAD, so an architect or contractor can pick the drawing up and keep working in it.",
    facts: [
      ["Dimensioned plan", "Room labels and door swings"],
      ["DXF export", "Opens in AutoCAD"],
      ["City presets", "Local plot conventions"],
      ["Report", "Area and room schedule"],
    ],
  },
  {
    name: "H&B Event Solution",
    cat: "Event production storefront",
    url: "https://hbevents.me/",
    host: "hbevents.me",
    img: "/media/case-hbevents.png",
    note: "Quote requests, not DMs",
    tags: ["Brand site", "Lead capture", "Portfolio"],
    problem:
      "A thirty-year event production business ran on referrals and WhatsApp. Stall fabrication, SMD screens and sound were sold face to face, with no portfolio a corporate client could forward internally and no structured way to request a quote.",
    solution:
      "A production-grade brand site that leads with the work: full-bleed event photography, a service breakdown for 3D stall fabrication, SMD screens and sound, a portfolio clients can share, and quote requests captured as structured enquiries instead of chat messages.",
    facts: [
      ["Quote requests", "Structured enquiry capture"],
      ["Portfolio", "Shareable proof of work"],
      ["Services", "Fabrication, screens, sound"],
    ],
  },
  {
    name: "Axiom",
    cat: "Private research instrument",
    url: "https://axiom-agent-three.vercel.app/",
    host: "axiom-agent-three.vercel.app",
    img: "/media/case-axiom.png",
    note: "Every claim keeps its source",
    tags: ["Research agent", "Next.js", "Vercel"],
    problem:
      "Chat assistants answer research questions in one confident paragraph and throw the evidence away. Anyone who has to defend a conclusion \u2014 to a client, a board or a regulator \u2014 cannot trace where it came from.",
    solution:
      "A research workspace that turns a question into a defensible trail: it reads sources, separates claims from reasoning, and keeps the link between them. Reports stay in a private library with a source collection per project, and the workspace shows how much research context a report consumed.",
    facts: [
      ["Research trail", "Claims linked to sources"],
      ["Source collections", "Per-project evidence"],
      ["Private workspace", "Sources stay yours"],
      ["50 sources / report", "Observed run depth"],
    ],
  },
  {
    name: "Cartesia Assistant",
    cat: "Low-latency voice assistant",
    url: "https://cartesia-assistant.vercel.app/",
    host: "cartesia-assistant.vercel.app",
    img: "/media/case-cartesia.png",
    note: "Call-style voice, pick a voice",
    tags: ["Voice AI", "Streaming", "Cartesia"],
    problem:
      "Typing is the wrong interface when hands and eyes are busy, and most voice demos stall long enough between turns that people give up and go back to text.",
    solution:
      "A call-shaped assistant built on Cartesia speech synthesis with streaming turn-taking, so a reply starts speaking while the rest is still being generated. A live waveform shows who holds the turn, and users choose from a roster of voices before the call starts.",
    facts: [
      ["Cartesia", "Streaming speech synthesis"],
      ["Turn-taking", "Reply starts early"],
      ["Voice roster", "Eleven selectable voices"],
      ["Call UI", "Mute, screen, end call"],
    ],
  },
];
