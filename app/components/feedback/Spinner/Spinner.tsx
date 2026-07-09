import styles from './Spinner.module.css';

type Props = {
  size?: number;
};

export default function Spinner({ size = 20 }: Props) {
  return (
    <span
      className={styles.spinner}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    />
  );
}
