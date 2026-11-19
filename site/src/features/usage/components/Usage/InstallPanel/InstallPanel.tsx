import { CodeBlock } from '../../../../../shared/ui/CodeBlock/CodeBlock';
import { Panel } from '../../../../../shared/ui/Panel/Panel';
import styles from './InstallPanel.module.css';

const INSTALL = 'npm install github:albsramos/live-factory';
const RENDER = `import { LivingCity } from 'live-factory';

export function Hero() {
  return <LivingCity style={{ borderRadius: 24 }} />;
}`;

export function InstallPanel() {
  return (
    <Panel title="Drop it in">
      <CodeBlock label="1 · Install" code={INSTALL} />
      <CodeBlock label="2 · Render it" code={RENDER} />
      <p className={styles.text}>
        It takes the full width of its container and keeps the scene's 1.86 : 1 shape. Give it a height and it fills
        that box instead. It pauses while scrolled out of view. React 17 or newer is the only requirement.
      </p>
    </Panel>
  );
}
