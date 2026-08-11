type ScreenStateProps = {
  kind: "loading" | "error" | "empty";
  title: string;
  description?: string;
  onRetry?: () => void;
};

export default function ScreenState({
  kind, title, description, onRetry,
}: ScreenStateProps) {
  return (
    <section className={`panel screen-state screen-state-${kind}`}>
      <strong>{title}</strong>
      {description && <p>{description}</p>}
      {onRetry && (
        <button className="secondary-button" onClick={onRetry}>
          다시 시도
        </button>
      )}
    </section>
  );
}
