// Just enough highlighting for the short TSX and shell samples on the page: keywords, strings and comments.

export type TokenKind = 'plain' | 'keyword' | 'string' | 'comment';
export interface Token {
  text: string;
  kind: TokenKind;
}

const KEYWORDS = new Set(['import', 'from', 'export', 'function', 'return', 'const', 'npm', 'install']);
const PATTERN = /(\/\/[^\n]*|#[^\n]*)|('[^'\n]*'|"[^"\n]*")|([A-Za-z_$][\w$]*)|(\s+|.)/g;

export function highlight(code: string): Token[] {
  const out: Token[] = [];
  for (const m of code.matchAll(PATTERN)) {
    const [text, comment, str, word] = m;
    const kind: TokenKind = comment ? 'comment' : str ? 'string' : word && KEYWORDS.has(word) ? 'keyword' : 'plain';
    const last = out[out.length - 1];
    if (last && last.kind === kind) last.text += text;
    else out.push({ text, kind });
  }
  return out;
}
