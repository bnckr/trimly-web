import "./loading-spinner.css";

type LoadingSpinnerProps = {
  label?: string;
};

export function LoadingSpinner({ label }: LoadingSpinnerProps) {
  return (
    <main className="loading-screen">
      <div className="loading-spinner" />

      {label ? <p>{label}</p> : null}
    </main>
  );
}