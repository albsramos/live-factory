import { Controls } from './Controls/Controls';
import { MotionNote } from './MotionNote/MotionNote';
import { Stage } from './Stage/Stage';
import styles from './Playground.module.css';

/** The live scene with its controls. Every setting lives in the URL, so a configured view can be shared. */
export function Playground() {
  return (
    <section className={styles.root} aria-label="Live scene">
      <Stage />
      <Controls />
      <MotionNote />
    </section>
  );
}
