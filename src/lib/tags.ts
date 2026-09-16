import type { ScoreTag } from "@/lib/types";

export const TAG_COPY: Record<ScoreTag, string> = {
  PSYOP: "Assessed as consistent with deliberate influence-operation dynamics.",
  WOO: "Claims that outrun available evidence into the paranormal or mystical register.",
  INTERESTING: "Novel, coherent, and worth attention regardless of ultimate truth.",
  LACKING_DATA: "Insufficient information to assess as presented.",
  VETTED: "Key assertions checked against publicly available information and hold up as described.",
  CREDIBLE: "Trustworthy as a claim, short of proof.",
};
