import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { Check, ChevronDown, Copy, CopyCheck } from "lucide-react";
import { useState } from "react";

import { CODE_BLOCK_LANGUAGES, getCodeBlockLanguageLabel } from "../lib/code-block";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

function CodeBlockNodeView({ node, updateAttributes }: NodeViewProps) {
  const [copied, setCopied] = useState(false);
  const language = (node.attrs.language as string | null | undefined) ?? null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(node.textContent);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch (error) {
      console.error("Copy code block failed", error);
    }
  };

  return (
    <NodeViewWrapper className="code-block-node">
      <div className="code-block-header" contentEditable={false}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="code-block-language-trigger" type="button">
              <span>{getCodeBlockLanguageLabel(language)}</span>
              <ChevronDown className="size-3.5 opacity-70" strokeWidth={1.85} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="code-block-language-content" sideOffset={6}>
            {CODE_BLOCK_LANGUAGES.map((item) => (
              <DropdownMenuItem
                key={item.value}
                className="code-block-language-item"
                onSelect={() => updateAttributes({ language: item.value })}
              >
                <span>{item.label}</span>
                {item.value === language ? <Check className="ml-auto size-4" strokeWidth={2} /> : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <button className="code-block-copy-button" onClick={handleCopy} type="button">
          {copied ? <CopyCheck className="size-3.5" strokeWidth={1.85} /> : <Copy className="size-3.5" strokeWidth={1.85} />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre>
        <NodeViewContent as={"code" as "div"} className={language ? `language-${language}` : undefined} />
      </pre>
    </NodeViewWrapper>
  );
}

export const EditorCodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockNodeView);
  },
});
