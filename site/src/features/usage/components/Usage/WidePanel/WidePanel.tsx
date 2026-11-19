import { CodeBlock } from '../../../../../shared/ui/CodeBlock/CodeBlock';
import { Code } from '../../../../../shared/ui/Code/Code';
import { Panel } from '../../../../../shared/ui/Panel/Panel';
import styles from './WidePanel.module.css';

const BANNER = `<LivingCity fit="contain" style={{ height: 520 }} />`;

export function WidePanel() {
  return (
    <Panel title="Wide banners">
      <p className={styles.text}>
        Past the classic frame the town keeps going: a new factory wing and the staff car park to the west, a second
        compute platform, Megapacks, a charging hub and a staff park to the east. With <Code>fit="contain"</Code>{' '}
        a banner shows the whole height and they fill its sides. Try the Banner shape above (1630 × 520).
      </p>
      <CodeBlock label="A 520 px banner" code={BANNER} />
    </Panel>
  );
}
