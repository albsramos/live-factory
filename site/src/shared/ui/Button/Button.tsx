import type { ComponentProps } from 'react';
import styles from './Button.module.css';

type ButtonProps = ComponentProps<'button'> & {
  /** `primary` for the main action in a group, `quiet` for everything else */
  variant?: 'primary' | 'quiet';
};

/** The site's button. Native props pass straight through; `className` is only for placing it. */
export function Button({ variant = 'quiet', type = 'button', className, ...rest }: ButtonProps) {
  return <button type={type} className={className ? `${styles.root} ${className}` : styles.root} data-variant={variant} {...rest} />;
}
