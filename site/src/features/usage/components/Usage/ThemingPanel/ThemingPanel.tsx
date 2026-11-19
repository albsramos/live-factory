import { Code } from '../../../../../shared/ui/Code/Code';
import { Panel } from '../../../../../shared/ui/Panel/Panel';
import styles from './ThemingPanel.module.css';

export function ThemingPanel() {
  return (
    <Panel title="Dark mode">
      <p className={styles.text}>By default the scene matches the page around it, in this order:</p>
      <ol className={styles.list}>
        <li>
          A <Code>data-theme</Code> on any ancestor (or <Code>data-bs-theme</Code>,{' '}
          <Code>data-color-scheme</Code>, <Code>data-mode</Code>), set to{' '}
          <Code>"dark"</Code> or <Code>"light"</Code>
        </li>
        <li>
          A <Code>dark</Code> or <Code>light</Code> class on{' '}
          <Code>&lt;html&gt;</Code> or <Code>&lt;body&gt;</Code>, as Tailwind and next-themes do
        </li>
        <li>The visitor's system setting</li>
      </ol>
      <p className={styles.text}>
        It notices changes as they happen and dissolves into the new look. Pass <Code>theme="light"</Code> or{' '}
        <Code>theme="dark"</Code> to fix one.
      </p>
    </Panel>
  );
}
