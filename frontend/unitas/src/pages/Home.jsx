import { Link } from 'react-router-dom';

// Trang tạm sau khi đăng nhập thành công, thay bằng trang chủ thật của Unitas
export default function Home() {
  return (
    <div style={{ padding: 40 }}>
      <h1>Unitas</h1>
      <p>Đăng nhập thành công (trang tạm).</p>
      <Link to="/login">Về trang đăng nhập</Link>
    </div>
  );
}
