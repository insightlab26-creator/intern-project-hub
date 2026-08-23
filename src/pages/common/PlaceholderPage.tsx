import { useLocation } from "react-router-dom";

type PlaceholderPageProps = { title?: string; description?: string };

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  const location = useLocation();
  const menuName = location.pathname.split("/").at(-1)?.split("-").map((word) => word[0]?.toUpperCase() + word.slice(1)).join(" ") ?? "V2";
  return <section className="v2-placeholder"><p>V2 STRUCTURE</p><h1>{title ?? menuName}</h1><span>{description ?? "이 메뉴의 화면과 데이터 연결은 다음 구현 단계에서 추가합니다."}</span></section>;
}
