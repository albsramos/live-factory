/**
 * Copy text to the clipboard. Where that isn't allowed, select `fallback`'s contents instead so the visitor can
 * copy it themselves. Resolves to what happened.
 */
export async function copyText(text: string, fallback: Element | null): Promise<'copied' | 'selected'> {
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    if (fallback) {
      const range = document.createRange();
      range.selectNodeContents(fallback);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
    return 'selected';
  }
}
