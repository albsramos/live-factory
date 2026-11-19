import styles from './Segmented.module.css';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

type SegmentedProps<T extends string> = {
  /** names the group for assistive tech; show a visible label next to it too */
  label: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

/** A row of mutually exclusive choices, the chosen one raised. */
export function Segmented<T extends string>({ label, options, value, onChange }: SegmentedProps<T>) {
  return (
    <div className={styles.root} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" className={styles.option} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
