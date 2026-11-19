import { useRef } from 'react';
import { highlight } from '../../lib/highlight';
import { CopyButton } from './CopyButton/CopyButton';
import styles from './CodeBlock.module.css';

type CodeBlockProps = {
  /** shown above the code, e.g. "1 · Install" */
  label: string;
  code: string;
};

/** A code sample with a caption and a copy button. */
export function CodeBlock({ label, code }: CodeBlockProps) {
  const pre = useRef<HTMLPreElement>(null);
  return (
    <figure className={styles.root}>
      <figcaption className={styles.head}>
        <span className={styles.label}>{label}</span>
        <CopyButton text={code} target={pre} />
      </figcaption>
      <pre ref={pre} className={styles.code}>
        {highlight(code).map((t, i) =>
          t.kind === 'plain' ? (
            t.text
          ) : (
            <span key={i} className={styles.token} data-kind={t.kind}>
              {t.text}
            </span>
          ),
        )}
      </pre>
    </figure>
  );
}
