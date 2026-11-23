import type { ComponentProps } from 'react';
import styles from './LinkButton.module.css';

/** A link that looks like the site's quiet button, for going somewhere rather than doing something. */
export function LinkButton({ className, ...rest }: ComponentProps<'a'>) {
  return <a className={className ? `${styles.root} ${className}` : styles.root} {...rest} />;
}
