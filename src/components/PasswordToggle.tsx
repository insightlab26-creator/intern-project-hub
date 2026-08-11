type Props = { visible: boolean; onToggle: () => void };

export default function PasswordToggle({ visible, onToggle }: Props) {
  return <button type="button" className="password-toggle" aria-label={visible ? "비밀번호 숨기기" : "비밀번호 표시"} aria-pressed={visible} onClick={onToggle}>
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {visible ? <><path d="M3 3l18 18" /><path d="M10.6 10.6a2 2 0 002.8 2.8" /><path d="M9.9 4.2A10.7 10.7 0 0112 4c5.5 0 9 6 9 6a16 16 0 01-2.1 2.7M6.6 6.6C4.3 8.2 3 10 3 10s3.5 6 9 6a9.8 9.8 0 004.1-.9" /></> : <><path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" /><circle cx="12" cy="12" r="2.5" /></>}
    </svg>
  </button>;
}
