import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Field from "../components/Field";
import RecoverLayout, {
  MailIcon,
  CheckIcon,
} from "../components/RecoverLayout";
import { validateForgot } from "../utils/validators";
import { forgotPassword } from "../services/authApi";

const COOLDOWN = 60;

export default function ForgotPassword() {
  const [values, setValues] = useState({ email: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useState(0);

  // Đếm ngược trước khi cho gửi lại
  useEffect(() => {
    if (seconds <= 0) return undefined;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const change = (e) => {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((er) => ({ ...er, [name]: "" }));
  };

  const send = async (email) => {
    setLoading(true);
    setServerError("");
    try {
      await forgotPassword({ email });
      setSentTo(email);
      setSeconds(COOLDOWN);
    } catch (err) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    const errs = validateForgot(values);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    send(values.email.trim());
  };

  // Màn hình sau khi đã gửi
  if (sentTo) {
    return (
      <RecoverLayout>
        <div className="rc-icon rc-icon--ok">
          <CheckIcon />
        </div>
        <h1 className="rc-title">Kiểm tra email của bạn</h1>
        <p className="rc-sub">
          Nếu <strong>{sentTo}</strong> đã đăng ký tài khoản, chúng tôi vừa gửi
          liên kết đặt lại mật khẩu. Liên kết có hiệu lực trong 15 phút.
        </p>
        <p className="rc-hint">
          Không thấy email? Hãy kiểm tra cả thư mục Spam.
        </p>

        {serverError && (
          <div className="rc-alert" role="alert">
            {serverError}
          </div>
        )}

        <button
          className="rc-btn rc-btn--ghost"
          type="button"
          disabled={loading || seconds > 0}
          onClick={() => send(sentTo)}
        >
          {seconds > 0
            ? `Gửi lại sau ${seconds}s`
            : loading
              ? "Đang gửi…"
              : "Gửi lại liên kết"}
        </button>
        <button
          className="rc-link-btn"
          type="button"
          onClick={() => setSentTo("")}
        >
          Dùng email khác
        </button>
        <Link className="rc-back" to="/login">
          ← Quay lại đăng nhập
        </Link>
      </RecoverLayout>
    );
  }

  // Màn hình nhập email
  return (
    <RecoverLayout>
      <div className="rc-icon">
        <MailIcon />
      </div>
      <h1 className="rc-title">Quên mật khẩu?</h1>
      <p className="rc-sub">
        Đừng lo. Nhập email đã đăng ký, chúng tôi sẽ gửi liên kết để bạn đặt lại
        mật khẩu.
      </p>

      <form onSubmit={submit} noValidate>
        <Field
          id="f-email"
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="ten@email.com"
          value={values.email}
          onChange={change}
          error={errors.email}
        />

        {serverError && (
          <div className="rc-alert" role="alert">
            {serverError}
          </div>
        )}

        <button className="rc-btn" type="submit" disabled={loading}>
          {loading ? "Đang gửi…" : "Gửi liên kết đặt lại"}
        </button>
      </form>

      <Link className="rc-back" to="/login">
        ← Quay lại đăng nhập
      </Link>
    </RecoverLayout>
  );
}
