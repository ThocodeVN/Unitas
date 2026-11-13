import { useState } from 'react';

export default function Field({ id, label, error, type = 'text', ...props }) {
  const [shown, setShown] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className="ua-field">
      <label htmlFor={id}>{label}</label>
      <div className="ua-inp">
        <input
          id={id}
          type={isPassword && shown ? 'text' : type}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${id}-err` : undefined}
          style={isPassword ? { paddingRight: 64 } : undefined}
          {...props}
        />
        {isPassword && (
          <button type="button" className="ua-eye" onClick={() => setShown((s) => !s)}>
            {shown ? 'Ẩn' : 'Hiện'}
          </button>
        )}
      </div>
      {error && <span id={`${id}-err`} className="ua-err" role="alert">{error}</span>}
    </div>
  );
}
