import { Playground } from '../../features/playground';
import { Usage } from '../../features/usage';
import { Header } from './Header/Header';
import styles from './App.module.css';

/** The demo page: what it is, the scene to play with, and how to use it. */
export function App() {
  return (
    <div className={styles.root}>
      <main className={styles.page}>
        <Header />
        <Playground />
        <Usage />
      </main>
    </div>
  );
}
