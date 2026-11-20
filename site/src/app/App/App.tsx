import { Playground, useSettings } from '../../features/playground';
import { Saver } from '../../features/saver';
import { Header } from './Header/Header';
import styles from './App.module.css';

/** The demo page: its name and the scene to play with; or, with `?saver` in the URL, the bare scene for a screen saver. */
export function App() {
  const s = useSettings();
  if (s.isSaver) return <Saver theme={s.theme} speed={s.speed} crowd={s.crowd} />;
  return (
    <div className={styles.root}>
      <main className={styles.page}>
        <Header />
        <Playground />
      </main>
    </div>
  );
}
