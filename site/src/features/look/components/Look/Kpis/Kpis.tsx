import { KPIS } from '../../../model/sample';
import styles from './Kpis.module.css';

/** Four stat cards on frosted glass, each with a twelve-bar trend whose last bar is today. */
export function Kpis() {
  return (
    <ul className={styles.root}>
      {KPIS.map((k) => (
        <li key={k.label} className={styles.card}>
          <div className={styles.head}>
            <h2 className={styles.label}>{k.label}</h2>
            <span className={styles.delta} data-tone={k.tone}>{k.delta}</span>
          </div>
          <p className={styles.value}>
            {k.value}
            <span className={styles.unit}>{k.unit}</span>
          </p>
          <div className={styles.spark} aria-hidden="true">
            {k.spark.map((v, i) => (
              <span key={i} className={styles.bar} data-state={i === k.spark.length - 1 ? 'now' : undefined} style={{ blockSize: `${v}%` }} />
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}
