import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import Field from '../components/Field';
import { validateRegister } from '../utils/validators';
import { register } from '../services/authApi';

export default function Register() {
  const navigate = useNavigate();
  const [values, setValues] = useState({ name: '', email: '', phone: '', username: '', password: '', password2: '' });
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
    const errs = validateRegister(values);
    setErrors(errs);
    setServerError('');
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      await register({
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone.replace(/\s/g, ''),
        username: values.username.trim(),
        password: values.password,
      });
      navigate('/login'); // sau này đổi thành trang xác thực email
    } catch (err) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
      <form onSubmit={submit} noValidate>
        <Field id="r-name" name="name" label="Họ và tên" autoComplete="name"
          placeholder="Nguyễn Văn A" value={values.name} onChange={change} error={errors.name} />
        <Field id="r-email" name="email" label="Email" type="email" autoComplete="email"
          placeholder="ten@email.com" value={values.email} onChange={change} error={errors.email} />
        <div className="ua-row">
          <Field id="r-phone" name="phone" label="Số điện thoại" type="tel" autoComplete="tel"
            placeholder="09xx xxx xxx" value={values.phone} onChange={change} error={errors.phone} />
          <Field id="r-user" name="username" label="Tên đăng nhập" autoComplete="username"
            placeholder="nguyenvana" value={values.username} onChange={change} error={errors.username} />
        </div>
        <Field id="r-pass" name="password" label="Mật khẩu" type="password" autoComplete="new-password"
          placeholder="Tối thiểu 8 ký tự" value={values.password} onChange={change} error={errors.password} />
        <Field id="r-pass2" name="password2" label="Nhập lại mật khẩu" type="password" autoComplete="new-password"
          placeholder="Nhập lại mật khẩu" value={values.password2} onChange={change} error={errors.password2} />

        {serverError && <div className="ua-alert" role="alert">{serverError}</div>}
        <button className="ua-btn" type="submit" disabled={loading} style={{ marginTop: 8 }}>
          {loading ? 'Đang tạo tài khoản…' : 'Tạo tài khoản'}
        </button>
      </form>
  );
}
