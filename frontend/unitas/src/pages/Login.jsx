import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Field from "../components/Field";
import { validateLogin } from "../utils/validators";
import { login } from "../services/authApi";

// Mã lỗi backend gửi về khi đăng nhập Google/Facebook thất bại (?error=...)
const SOCIAL_ERRORS = {
  cancelled: "Bạn đã hủy đăng nhập.",
  invalid_state: "Phiên đăng nhập đã hết hạn, vui lòng thử lại.",
  no_email:
    "Tài khoản mạng xã hội này không cung cấp email nên không thể đăng nhập.",
  email_exists:
    "Email này đã có tài khoản. Hãy đăng nhập bằng cách bạn đã dùng khi đăng ký.",
  not_configured: "Đăng nhập bằng mạng xã hội chưa được cấu hình.",
  server_error: "Có lỗi xảy ra khi đăng nhập, vui lòng thử lại.",
};

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(
    SOCIAL_ERRORS[searchParams.get("error")] || "",
  );
  const [loading, setLoading] = useState(false);

  const change = (e) => {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((er) => ({ ...er, [name]: "" }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validateLogin(values);
    setErrors(errs);
    setServerError("");
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      await login({ email: values.email.trim(), password: values.password });
      navigate("/");
    } catch (err) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <Field
        id="l-email"
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="ten@email.com"
        value={values.email}
        onChange={change}
        error={errors.email}
      />
      <Field
        id="l-pass"
        name="password"
        label="Mật khẩu"
        type="password"
        autoComplete="current-password"
        placeholder="Nhập mật khẩu"
        value={values.password}
        onChange={change}
        error={errors.password}
      />

      <div className="ua-meta">
        <Link className="ua-link" to="/forgot-password">
          Quên mật khẩu?
        </Link>
      </div>

      {serverError && (
        <div className="ua-alert" role="alert">
          {serverError}
        </div>
      )}
      <button className="ua-btn" type="submit" disabled={loading}>
        {loading ? "Đang đăng nhập…" : "Đăng nhập"}
      </button>
    </form>
  );
}
