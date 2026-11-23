import { HOURS, ON_SITE } from '../../../model/sample';
import styles from './Today.module.css';

/** Below the stat cards: output by hour against plan, and what is on the site right now. */
export function Today() {
  return (
    <div className={styles.root}>
      <section className={styles.chart} aria-labelledby="look-output">
        <h2 id="look-output" className={styles.title}>Output by hour</h2>
        <p className={styles.sub}>Vehicles off the line, 06:00 to 17:00</p>
        <div className={styles.legend}>
          <span className={styles.key} data-kind="built">Built</span>
          <span className={styles.key} data-kind="plan">Plan</span>
        </div>
        <div className={styles.plot}>
          {HOURS.map((h) => (
            <div key={h.hour} className={styles.hour} title={`${h.hour}:00, built ${h.built}, plan ${h.plan}`}>
              <span className={styles.built} style={{ blockSize: `${h.built}%` }} />
              <span className={styles.plan} style={{ blockSize: `${h.plan}%` }} />
            </div>
          ))}
        </div>
        <div className={styles.axis} aria-hidden="true">
          {HOURS.map((h) => <span key={h.hour}>{h.hour}</span>)}
        </div>
      </section>

      <section className={styles.list} aria-labelledby="look-onsite">
        <h2 id="look-onsite" className={styles.title}>On site now</h2>
        <ul className={styles.rows}>
          {ON_SITE.map((r) => (
            <li key={r.label} className={styles.row}>
              <span className={styles.dot} data-kind={r.kind} aria-hidden="true" />
              <span className={styles.rowLabel}>{r.label}</span>
              <span className={styles.count}>{r.count}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
