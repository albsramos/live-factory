import { Playground } from '../../features/playground';
import { Header } from './Header/Header';
import styles from './App.module.css';

/** The demo page: its name and the scene to play with. */
export function App() {
  return (
    <div className={styles.root}>
      <main className={styles.page}>
        <Header />
        <Playground />
      </main>
    </div>
  );
}
