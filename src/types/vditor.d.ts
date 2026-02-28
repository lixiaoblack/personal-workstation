/**
 * Vditor 类型声明
 */

declare module "vditor" {
  interface VditorOptions {
    height?: number | string;
    minHeight?: number;
    width?: number | string;
    placeholder?: string;
    value?: string;
    lang?: string;
    mode?: "sv" | "ir" | "wysiwyg";
    theme?: "classic" | "dark";
    icon?: "ant" | "material";
    lineNum?: boolean;
    readonly?: boolean;
    toolbar?: boolean | (string | { name: string; tip: string })[];
    cache?: {
      enable: boolean;
      id?: string;
      after?: (markdown: string) => void;
    };
    preview?: {
      theme?: {
        current: string;
        path: string;
      };
      hljs?: {
        enable: boolean;
        lineNumber?: boolean;
        style?: string;
      };
      markdown?: {
        toc?: boolean;
        mark?: boolean;
        footnotes?: boolean;
        autoSpace?: boolean;
      };
      math?: {
        inlineDigit?: boolean;
      };
    };
    hint?: {
      parse?: boolean;
      emoji?: Record<string, string>;
    };
    upload?: {
      handler?: (files: File[]) => Promise<string | null>;
      url?: string;
      accept?: string;
      headers?: Record<string, string>;
    };
    input?: (value: string) => void;
    focus?: () => void;
    blur?: () => void;
    after?: () => void;
    ctrlKey?: (key: string) => boolean;
  }

  class Vditor {
    constructor(element: HTMLElement, options: VditorOptions);
    getValue(): string;
    setValue(value: string): void;
    getHTML(): string;
    insertValue(value: string): void;
    focus(): void;
    blur(): void;
    disabled(disable: boolean): void;
    destroy(): void;
  }

  export default Vditor;
}
