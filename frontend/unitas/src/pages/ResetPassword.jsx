import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Field from "../components/Field";
import RecoverLayout, {
  LockIcon,
  CheckIcon,
  AlertIcon,
} from "../components/RecoverLayout";
import { validateReset } from "../utils/validators";
import { resetPassword } from "../services/authApi";

const LEVELS = ["Quá ngắn", "Yếu", "Trung bình", "Khá", "Mạnh"];

// Điểm từ 0 đến 4: dài >= 8, có hoa và thường, có số, có ký tự đặc biệt hoặc dài >= 12
function strengthOf(p) {
  if (p.length < 8) return 0;
  let s = 1;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s += 1;
  if (/\d/.test(p)) s += 1;
  if (/[^A-Za-z0-9]/.test(p) || p.length >= 12) s += 1;
  return s;
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [values, setValues] = useState({ password: "", password2: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  // Thành công thì tự chuyển sang trang đăng nhập sau 3 giây
  useEffect(() => {
    if (!done) return undefined;
    const t = setTimeout(() => navigate("/login"), 3000);
    return () => clearTimeout(t);
  }, [done, navigate]);

  const change = (e) => {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((er) => ({ ...er, [name]: "" }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validateReset(values);
    setErrors(errs);
    setServerError("");
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      await resetPassword({ token, password: values.password });
      setDone(true);
    } catch (err) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <RecoverLayout>
        <div className="rc-icon rc-icon--warn">
          <AlertIcon />
        </div>
        <h1 className="rc-title">Liên kết không hợp lệ</h1>
        <p className="rc-sub">
          Liên kết đặt lại mật khẩu bị thiếu hoặc đã hỏng. Hãy yêu cầu một liên
          kết mới.
        </p>
        <Link className="rc-btn" to="/forgot-password">
          Gửi lại liên kết
        </Link>
        <Link className="rc-back" to="/login">
          ← Quay lại đăng nhập
        </Link>
      </RecoverLayout>
    );
  }

  if (done) {
    return (
      <RecoverLayout>
        <div className="rc-icon rc-icon--ok">
          <CheckIcon />
        </div>
        <h1 className="rc-title">Đã đặt lại mật khẩu</h1>
        <p className="rc-sub">
          Mật khẩu của bạn đã được cập nhật. Đang chuyển tới trang đăng nhập…
        </p>
        <Link className="rc-btn" to="/login">
          Đăng nhập ngay
        </Link>
      </RecoverLayout>
    );
  }

  const level = strengthOf(values.password);

  return (
    <RecoverLayout>
      <div className="rc-icon">
        <LockIcon />
      </div>
      <h1 className="rc-title">Đặt lại mật khẩu</h1>
      <p className="rc-sub">Tạo mật khẩu mới cho tài khoản của bạn.</p>

      <form onSubmit={submit} noValidate>
        <Field
          id="r-pass"
          name="password"
          label="Mật khẩu mới"
          type="password"
          autoComplete="new-password"
          placeholder="Tối thiểu 8 ký tự"
          value={values.password}
          onChange={change}
          error={errors.password}
        />

        {values.password && (
          <div className="rc-meter" data-level={level}>
            <div className="rc-meter-bars">
              {[1, 2, 3, 4].map((n) => (
                <span key={n} className={n <= level ? "on" : ""} />
              ))}
            </div>
            <span className="rc-meter-label">{LEVELS[level]}</span>
          </div>
        )}

        <Field
          id="r-pass2"
          name="password2"
          label="Nhập lại mật khẩu"
          type="password"
          autoComplete="new-password"
          placeholder="Nhập lại mật khẩu"
          value={values.password2}
          onChange={change}
          error={errors.password2}
        />

        {serverError && (
          <div className="rc-alert" role="alert">
            {serverError}
          </div>
        )}

        <button className="rc-btn" type="submit" disabled={loading}>
          {loading ? "Đang lưu…" : "Đặt lại mật khẩu"}
        </button>
      </form>

      <Link className="rc-back" to="/login">
        ← Quay lại đăng nhập
      </Link>
    </RecoverLayout>
  );
}
