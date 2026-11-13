export const REQUIRED = 'Vui lòng nhập trường này';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^(0|\+84)\d{9}$/;
const USER_RE = /^[a-zA-Z0-9_.]{4,}$/;

const emailError = (v) => (EMAIL_RE.test(v) ? '' : 'Email không đúng định dạng');
const passError = (v) => (v.length >= 8 ? '' : 'Mật khẩu tối thiểu 8 ký tự');

function run(values, rules) {
  const errors = {};
  for (const [key, check] of Object.entries(rules)) {
    const v = (values[key] ?? '').trim();
    const msg = !v ? REQUIRED : check(v, values);
    if (msg) errors[key] = msg;
  }
  return errors;
}

export const validateLogin = (values) =>
  run(values, { email: emailError, password: passError });

export const validateRegister = (values) =>
  run(values, {
    name: () => '',
    email: emailError,
    phone: (v) => (PHONE_RE.test(v.replace(/\s/g, '')) ? '' : 'Số điện thoại không đúng định dạng'),
    username: (v) => (USER_RE.test(v) ? '' : 'Tối thiểu 4 ký tự, chỉ gồm chữ, số, _ hoặc .'),
    password: passError,
    password2: (v, all) => (v === all.password ? '' : 'Mật khẩu nhập lại không khớp'),
  });
