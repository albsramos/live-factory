import { useId, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import styles from './Slider.module.css';

type SliderProps = {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  /** how the value reads next to the track, e.g. "1.5×" */
  format: (value: number) => string;
  onChange: (value: number) => void;
  /** `live` reports every step; `release` only when the thumb is let go (for changes that are costly to apply) */
  commit?: 'live' | 'release';
};

/** A labelled range input with its value beside it. */
export function Slider({ label, min, max, step, value, format, onChange, commit = 'live' }: SliderProps) {
  const id = useId();
  // while dragging a `release` slider, the thumb shows this draft rather than the committed value
  const [draft, setDraft] = useState<number | null>(null);
  const shown = draft ?? value;

  const handleInput = (next: number) => {
    if (commit === 'live') onChange(next);
    else setDraft(next);
  };
  const handleRelease = (e: PointerEvent<HTMLInputElement> | KeyboardEvent<HTMLInputElement>) => {
    if (commit === 'live' || draft === null) return;
    onChange(Number(e.currentTarget.value));
    setDraft(null);
  };

  return (
    <div className={styles.root}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className={styles.input}
        type="range"
        min={min}
        max={max}
        step={step}
        value={shown}
        style={{ '--fill': `${((shown - min) / (max - min)) * 100}%` } as CSSProperties}
        onChange={(e) => handleInput(Number(e.target.value))}
        onPointerUp={handleRelease}
        onKeyUp={handleRelease}
      />
      <output className={styles.value} htmlFor={id}>
        {format(shown)}
      </output>
    </div>
  );
}
