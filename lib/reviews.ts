export interface Review {
  ini: string;
  name: string;
  role: string;
  q: string;
}

/**
 * Written marketing copy, not yet approved client quotes.
 * Confirm names, titles and permission before launch.
 * "Loius" is spelled to match the orbit portrait label — intentional.
 */
export const REVIEWS: Review[] = [
  {
    ini: "LW",
    name: "Loius Walker",
    role: "VP Engineering, Nortex",
    q: "\u201CHalyx took our routing model from a notebook to a service running in two regions behind a 99.9% SLA. Late deliveries fell 28% in the first quarter, and their team stayed through handover until our engineers owned it.\u201D",
  },
  {
    ini: "AR",
    name: "Dr. Anita Rao",
    role: "Chief Medical Information Officer, Clinix",
    q: "\u201CWe had been told a triage copilot would take a year. They had clinicians testing a working version in five weeks and did not oversell what it could not do. Intake time is down 46% and the audit trail satisfied our compliance team.\u201D",
  },
  {
    ini: "MK",
    name: "Marcus Kelling",
    role: "Head of Data, Synergise4",
    q: "\u201COur forecasting pipeline used to be one notebook and one person who understood it. It is now a tested service with monitoring, and stock waste is down 31%. The documentation alone was worth the engagement.\u201D",
  },
  {
    ini: "FO",
    name: "Folake Ogunbiyi",
    role: "COO, Meridian Health Group",
    q: "\u201CThey asked which number we were trying to move before writing any code, then reported against it every two weeks. That is rare. We renewed for a second phase before the first one closed.\u201D",
  },
  {
    ini: "TS",
    name: "Tomas Svoboda",
    role: "CTO, Ledgerline",
    q: "\u201CThe design system they built meant our second product took a third of the time as the first. Two years on, our own team still ships on it without calling them.\u201D",
  },
  {
    ini: "PN",
    name: "Priya Nandakumar",
    role: "Director of Product, Arkadia Retail",
    q: "\u201CTwo weeks in they told us one of the features we had asked for would not pay for itself, and showed the numbers. We cut it. I trust a vendor that argues with the brief.\u201D",
  },
];
