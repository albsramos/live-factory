import { LinkButton } from '../../../shared/ui/LinkButton/LinkButton';
import styles from './Header.module.css';

export function Header() {
  return (
    <header className={styles.root}>
      <h1 className={styles.title}>Live Factory</h1>
      <LinkButton href="?look">Possible look</LinkButton>
    </header>
  );
}
