import { useLocation } from "react-router-dom";
import { findTitle } from "../utils/nav";

export default function FeaturePlaceholder() {
  const { pathname } = useLocation();
  const title = findTitle(pathname);

  return (
    <section className="db-card db-placeholder">
      <span className="db-feature-kicker">Đang hoàn thiện</span>
      <h2>{title}</h2>
      <p className="db-card-copy">
        Backend hiện chưa có dữ liệu và API cho mục này. Trang sẽ hiển thị thông
        tin thật khi mô-đun tương ứng được triển khai.
      </p>
    </section>
  );
}
