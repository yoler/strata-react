import i18next from "i18next";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

const EDITOR_I18N_PREFIX = "editor";
type EditorI18nOptions = Record<string, string | number | boolean | undefined>;

export function editorT(key: string, options?: EditorI18nOptions) {
  return i18next.t(`${EDITOR_I18N_PREFIX}.${key}`, options);
}

export function useEditorI18n() {
  const { t } = useTranslation();

  return useCallback((key: string, options?: EditorI18nOptions) => t(`${EDITOR_I18N_PREFIX}.${key}`, options), [t]);
}
