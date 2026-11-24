import { Link, Outlet, useLocation } from 'react-router-dom';
import logoWhite from '../assets/unitas-logo-white.png';
import logoBlack from '../assets/unitas-logo-black.png';
import { socialLogin } from '../services/authApi';
import '../styles/auth.css';

const COPY = {
  login: { title: 'Chào mừng trở lại', subtitle: 'Đăng nhập để vào phòng của bạn.' },
  register: { title: 'Tạo tài khoản', subtitle: 'Vài thông tin để bắt đầu cùng phòng của bạn.' },
};

export default function AuthLayout() {
  const { pathname } = useLocation();
  const isLogin = pathname !== '/register';
  const { title, subtitle } = COPY[isLogin ? 'login' : 'register'];
  // Đăng nhập → Đăng ký: nội dung trượt vào từ phải. Ngược lại: từ trái.
  const enter = isLogin ? 'ua-enter-left' : 'ua-enter-right';

  return (
    <main className="ua-page">
      <aside className="ua-brand">
        <img src={logoWhite} alt="Logo Unitas" />
        <div>
          <div className="ua-bar" />
          <h2>Ở chung, chi tiêu rõ ràng.</h2>
          <p>Quỹ chung, việc chung của cả phòng trọ — gọn trong một nơi.</p>
        </div>
      </aside>

      <section className="ua-panel">
        <div className="ua-card">
          <img className="ua-mlogo" src={logoBlack} alt="Logo Unitas" />

          <div className="ua-tabs">
            <span className="ua-ind" style={{ transform: isLogin ? 'translateX(0)' : 'translateX(100%)' }} />
            <Link to="/login" className="ua-tab" aria-selected={isLogin}>Đăng nhập</Link>
            <Link to="/register" className="ua-tab" aria-selected={!isLogin}>Đăng ký</Link>
          </div>

          <div key={pathname} className={enter}>
            <h1>{title}</h1>
            <p className="ua-sub">{subtitle}</p>

            <Outlet />

            <div className="ua-or">hoặc</div>
            <div className="ua-social">
              <button type="button" className="ua-sbtn" onClick={() => socialLogin('google')}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h6.2a5.3 5.3 0 0 1-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.4z"/><path fill="#34A853" d="M12 23.5c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.3 1.1-3.9 1.1-3 0-5.5-2-6.4-4.7H1.8v3a11.5 11.5 0 0 0 10.2 6.3z"/><path fill="#FBBC05" d="M5.6 14.2a6.9 6.9 0 0 1 0-4.4v-3H1.8a11.5 11.5 0 0 0 0 10.4l3.8-3z"/><path fill="#EA4335" d="M12 5.4c1.7 0 3.2.6 4.4 1.7l3.3-3.3A11.5 11.5 0 0 0 1.8 6.8l3.8 3C6.5 7.4 9 5.4 12 5.4z"/></svg>
                Google
              </button>
              <button type="button" className="ua-sbtn" onClick={() => socialLogin('facebook')}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#1877F2" d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z"/></svg>
                Facebook
              </button>
            </div>

            <p className="ua-foot">
              {isLogin ? <>Chưa có tài khoản? <Link to="/register">Đăng ký</Link></>
                       : <>Đã có tài khoản? <Link to="/login">Đăng nhập</Link></>}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}