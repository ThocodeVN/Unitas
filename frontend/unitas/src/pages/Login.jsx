import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Field from '../components/Field';
import { validateLogin } from '../utils/validators';
import { login } from '../services/authApi';

export default function Login() {
  const navigate = useNavigate();
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const change = (e) => {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((er) => ({ ...er, [name]: '' }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validateLogin(values);
    setErrors(errs);
    setServerError('');
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      await login({ email: values.email.trim(), password: values.password });
      navigate('/');
    } catch (err) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <Field id="l-email" name="email" label="Email" type="email" autoComplete="email"
        placeholder="ten@email.com" value={values.email} onChange={change} error={errors.email} />
      <Field id="l-pass" name="password" label="Mật khẩu" type="password" autoComplete="current-password"
        placeholder="Nhập mật khẩu" value={values.password} onChange={change} error={errors.password} />

        <div className="ua-meta"><a className="ua-link" href="/forgot-password">Quên mật khẩu?</a></div>

        {serverError && <div className="ua-alert" role="alert">{serverError}</div>}
        <button className="ua-btn" type="submit" disabled={loading}>
          {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
      </form>
  );
}
