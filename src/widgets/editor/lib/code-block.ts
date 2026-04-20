import { common, createLowlight } from "lowlight";

export const lowlight = createLowlight(common);

export const CODE_BLOCK_LANGUAGES = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "tsx", label: "TSX" },
  { value: "json", label: "JSON" },
  { value: "xml", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "bash", label: "Bash" },
  { value: "python", label: "Python" },
  { value: "sql", label: "SQL" },
  { value: "yaml", label: "YAML" },
  { value: "markdown", label: "Markdown" },
  { value: "plaintext", label: "Plain text" },
] as const;

const AUTO_DETECT_SUBSET = CODE_BLOCK_LANGUAGES.map((language) => language.value).filter(
  (language) => language !== "plaintext",
);

export const DEFAULT_CODE_BLOCK_LANGUAGE = "javascript";

export function getCodeBlockLanguageLabel(language?: string | null) {
  return CODE_BLOCK_LANGUAGES.find((item) => item.value === language)?.label ?? "Plain text";
}

export function detectCodeBlockLanguage(source: string) {
  const text = source.trim();

  if (!text) {
    return DEFAULT_CODE_BLOCK_LANGUAGE;
  }

  try {
    const result = lowlight.highlightAuto(text, {
      subset: AUTO_DETECT_SUBSET,
    });

    const language = typeof result.data?.language === "string" ? result.data.language : null;
    const relevance = typeof result.data?.relevance === "number" ? result.data.relevance : 0;

    if (!language || relevance < 2) {
      return DEFAULT_CODE_BLOCK_LANGUAGE;
    }

    return language;
  } catch (error) {
    console.error("Code block language detection failed", error);
    return DEFAULT_CODE_BLOCK_LANGUAGE;
  }
}
