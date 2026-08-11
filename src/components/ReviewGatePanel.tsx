/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { REVIEW_GATE_RESULT_LABELS } from "../constants/domainLabels";
import { createReviewGate, getReviewGates } from "../services/reviewGateService";
import type { ReviewGate, ReviewGateResult, ReviewGateTarget } from "../types/domain";
import ScreenState from "./ScreenState";

const resultDescriptions: Record<ReviewGateResult, string> = {
  REVISE: "가능성이 있지만 보완이 필요합니다.",
  KEEP: "참고 자료로 보관합니다.",
  ASSET: "BX 사업자산으로 활용할 수 있습니다.",
  DROP: "추가 진행을 중단하고 사유를 남깁니다.",
};

export default function ReviewGatePanel({ targetType, targetId }: { targetType: ReviewGateTarget; targetId: string }) {
  const [items, setItems] = useState<ReviewGate[]>([]);
  const [result, setResult] = useState<ReviewGateResult>("REVISE");
  const [comments, setComments] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [dropReason, setDropReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setItems(await getReviewGates(targetType, targetId));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "검토 이력을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [targetType, targetId]);

  useEffect(() => { void load(); }, [load]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      await createReviewGate(targetType, targetId, result, comments, nextAction, sourceUrl, dropReason);
      setComments("");
      setNextAction("");
      setSourceUrl("");
      setDropReason("");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "검토 결과를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return <section className={`review-gate-panel ${targetType === "DELIVERABLE" ? "review-gate-embedded" : ""}`}>
    <header className="review-gate-header">
      <div><p className="eyebrow">REVIEW GATE</p><h2>판정과 다음 방향</h2><p>회의록을 다시 작성하지 않고 결론과 다음 조치만 남깁니다.</p></div>
      {items[0] && <span className={`review-result-badge result-${items[0].result.toLowerCase()}`}>최신 · {REVIEW_GATE_RESULT_LABELS[items[0].result]}</span>}
    </header>
    {error && <div className="notice-message review-gate-error">{error}</div>}
    <div className="review-gate-layout">
      <form className="review-gate-form" onSubmit={submit}>
        <div className="review-result-options">{(Object.keys(REVIEW_GATE_RESULT_LABELS) as ReviewGateResult[]).map(value => <label className={result === value ? "selected" : ""} key={value}><input type="radio" name={`review-result-${targetId}`} value={value} checked={result === value} onChange={() => setResult(value)} /><span><strong>{value}</strong><small>{resultDescriptions[value]}</small></span></label>)}</div>
        <label className="review-field">결정 요약 *<textarea rows={3} required placeholder="무엇을 어떻게 하기로 했는지 짧게 입력하세요." value={comments} onChange={event => setComments(event.target.value)} /></label>
        <label className="review-field">다음 조치<textarea rows={3} placeholder="후속 작업이나 수정 방향을 입력하세요." value={nextAction} onChange={event => setNextAction(event.target.value)} /></label>
        <label className="review-field">Teams 회의록 링크<input type="url" placeholder="https://" value={sourceUrl} onChange={event => setSourceUrl(event.target.value)} /></label>
        {result === "DROP" && <label className="review-field">DROP 사유 *<textarea rows={3} required placeholder="같은 시행착오를 반복하지 않도록 구체적으로 기록하세요." value={dropReason} onChange={event => setDropReason(event.target.value)} /></label>}
        <div className="review-form-actions"><button className="primary-button" disabled={saving}>{saving ? "저장 중..." : "판정 기록"}</button></div>
      </form>
      <section className="review-history-panel"><div className="review-history-heading"><h3>판정 이력</h3><span>{items.length}건</span></div>{loading ? <ScreenState kind="loading" title="검토 이력을 불러오는 중입니다." /> : items.length === 0 ? <ScreenState kind="empty" title="아직 Review Gate 기록이 없습니다." /> : <div className="review-history-list">{items.map(item => <article className="review-history-card" key={item.id}><div><span className={`review-result-badge result-${item.result.toLowerCase()}`}>{REVIEW_GATE_RESULT_LABELS[item.result]}</span><time>{new Date(item.reviewedAt).toLocaleString("ko-KR")}</time></div><p>{item.comments || "결정 요약 없음"}</p>{item.nextAction && <div className="review-next-action"><strong>다음 조치</strong><span>{item.nextAction}</span></div>}{item.sourceUrl && <a className="review-source-link" href={item.sourceUrl} target="_blank" rel="noreferrer">Teams 회의록 열기 ↗</a>}{item.dropReason && <div className="review-drop-reason"><strong>DROP 사유</strong><span>{item.dropReason}</span></div>}</article>)}</div>}</section>
    </div>
  </section>;
}
