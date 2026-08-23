import { useLocation } from "react-router-dom";
import { V2Card } from "../../components/ui/V2Card";
import { V2EmptyState } from "../../components/ui/V2EmptyState";
import { V2PageHeader } from "../../components/ui/V2PageHeader";

type PlaceholderPageProps = { title?: string; description?: string };

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  const location = useLocation();
  const menuName = location.pathname.split("/").at(-1)?.split("-").map((word) => word[0]?.toUpperCase() + word.slice(1)).join(" ") ?? "Application";
  const pageTitle = title ?? menuName;
  const pageDescription = description ?? "이 메뉴의 화면과 데이터 연결은 다음 구현 단계에서 추가합니다.";
  return <><V2PageHeader eyebrow="APPLICATION" title={pageTitle} description={pageDescription} /><V2Card><V2EmptyState title={`${pageTitle} 준비 중`} description="현재는 공통 UI와 역할별 정보 구조만 연결되어 있습니다." /></V2Card></>;
}
