export type V2Tab = { id: string; label: string; disabled?: boolean };

export function V2Tabs({ tabs, activeId, onChange }: { tabs: V2Tab[]; activeId: string; onChange: (id: string) => void }) {
  return <div className="v2-tabs" role="tablist">{tabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={tab.id === activeId} disabled={tab.disabled} className={`v2-tabs__tab${tab.id === activeId ? " v2-tabs__tab--active" : ""}`} onClick={() => onChange(tab.id)}>{tab.label}</button>)}</div>;
}
