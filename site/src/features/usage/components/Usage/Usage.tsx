import { InstallPanel } from './InstallPanel/InstallPanel';
import { ThemingPanel } from './ThemingPanel/ThemingPanel';
import { WidePanel } from './WidePanel/WidePanel';
import styles from './Usage.module.css';

/** How to put the scene in an app: install and render, dark mode, wide banners. */
export function Usage() {
  return (
    <div className={styles.root}>
      <div className={styles.grid}>
        <InstallPanel />
        <div className={styles.side}>
          <ThemingPanel />
          <WidePanel />
        </div>
      </div>
    </div>
  );
}
