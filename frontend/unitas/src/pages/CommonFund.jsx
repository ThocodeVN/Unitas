import { useState } from "react";
import Icon from "../components/Icon";
import { formatVND } from "../utils/format";
import "../styles/commonFund.css";

const INITIAL_CASH = 5_200_000;
const INITIAL_ACCOUNT = 13_250_000;
const BANK_ACCOUNT_BALANCE = 25_800_000;
const TREASURER_PERSONAL_BALANCE = BANK_ACCOUNT_BALANCE - INITIAL_ACCOUNT;
const TIME_SERIES = {
  week: [
    {
      id: "week-current",
      label: "19–25/11/2026",
      points: [
        { label: "19/11", cash: 4_650_000, account: 11_900_000 },
        { label: "20/11", cash: 4_820_000, account: 12_100_000 },
        { label: "21/11", cash: 4_800_000, account: 12_200_000 },
        { label: "22/11", cash: 4_950_000, account: 12_650_000 },
        { label: "23/11", cash: 5_000_000, account: 12_850_000 },
        { label: "24/11", cash: 5_100_000, account: 12_850_000 },
        { label: "25/11", cash: INITIAL_CASH, account: INITIAL_ACCOUNT },
      ],
    },
    {
      id: "week-previous",
      label: "12–18/11/2026",
      points: [
        { label: "12/11", cash: 4_200_000, account: 11_000_000 },
        { label: "13/11", cash: 4_350_000, account: 11_100_000 },
        { label: "14/11", cash: 4_350_000, account: 11_600_000 },
        { label: "15/11", cash: 4_500_000, account: 11_700_000 },
        { label: "16/11", cash: 4_600_000, account: 11_900_000 },
        { label: "17/11", cash: 4_500_000, account: 11_900_000 },
        { label: "18/11", cash: 4_650_000, account: 11_900_000 },
      ],
    },
  ],
  month: [
    {
      id: "2026-11",
      label: "Tháng 11, 2026",
      points: [
        { label: "1–7/11", cash: 3_900_000, account: 10_800_000 },
        { label: "8–14/11", cash: 4_350_000, account: 11_600_000 },
        { label: "15–21/11", cash: 4_800_000, account: 12_200_000 },
        { label: "22–25/11", cash: INITIAL_CASH, account: INITIAL_ACCOUNT },
      ],
    },
    {
      id: "2026-10",
      label: "Tháng 10, 2026",
      points: [
        { label: "1–7/10", cash: 3_700_000, account: 10_200_000 },
        { label: "8–14/10", cash: 4_100_000, account: 10_900_000 },
        { label: "15–21/10", cash: 4_500_000, account: 11_400_000 },
        { label: "22–28/10", cash: 4_700_000, account: 11_800_000 },
        { label: "29–31/10", cash: 4_900_000, account: 12_100_000 },
      ],
    },
  ],
};

const INTEGRATED_BANK = { name: "Vietcombank", short: "VCB", color: "#08784e" };
const BANK_OPTIONS = [
  INTEGRATED_BANK,
  { name: "BIDV", short: "BIDV", color: "#1c4d9b" },
  { name: "Techcombank", short: "TCB", color: "#d9272e" },
  { name: "MB Bank", short: "MB", color: "#173e82" },
];

function AdjustmentDialog({ onClose, onSubmit }) {
  const [source, setSource] = useState("account");
  const [newBalance, setNewBalance] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const currentBalance = source === "cash" ? INITIAL_CASH : INITIAL_ACCOUNT;

  const submit = (event) => {
    event.preventDefault();
    const value = Number(newBalance);
    if (!Number.isFinite(value) || value < 0 || !reason.trim()) return;
    if (value === currentBalance) {
      setError("Số dư mới phải khác số dư hiện tại.");
      return;
    }
    onSubmit({ source, currentBalance, newBalance: value, reason: reason.trim() });
  };

  return (
    <div className="cf-overlay" onMouseDown={onClose}>
      <section
        className="cf-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cf-adjust-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="cf-dialog-head">
          <div className="cf-dialog-icon"><Icon name="sliders" /></div>
          <button className="cf-icon-button" type="button" aria-label="Đóng" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        <h2 id="cf-adjust-title">Điều chỉnh số dư</h2>
        <p className="cf-dialog-copy">
          Nhập số dư mới để các thành viên cùng xem xét và duyệt.
        </p>

        <form className="cf-form" onSubmit={submit}>
          <label className="cf-field-label" htmlFor="cf-source">Điều chỉnh khoản nào?</label>
          <select
            id="cf-source"
            value={source}
            onChange={(event) => { setSource(event.target.value); setNewBalance(""); setError(""); }}
          >
            <option value="account">Tiền tài khoản</option>
            <option value="cash">Tiền mặt</option>
          </select>

          <label className="cf-field-label" htmlFor="cf-current-balance">Số dư hiện tại</label>
          <div className="cf-form-static" id="cf-current-balance">{formatVND(currentBalance)}</div>

          <label className="cf-field-label" htmlFor="cf-new-balance">Số dư mới</label>
          <div className="cf-input-wrap">
            <input
              id="cf-new-balance"
              inputMode="numeric"
              min="0"
              placeholder="Nhập số dư mới"
              required
              type="number"
              value={newBalance}
              onChange={(event) => { setNewBalance(event.target.value); setError(""); }}
            />
            <span>₫</span>
          </div>

          <label className="cf-field-label" htmlFor="cf-reason">Lý do điều chỉnh</label>
          <textarea
            id="cf-reason"
            maxLength="240"
            placeholder="Mô tả ngắn gọn lý do điều chỉnh..."
            required
            rows="3"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />

          {error && <div className="cf-form-error" role="alert">{error}</div>}

          <div className="cf-approval-note">
            <span className="cf-note-icon"><Icon name="users" /></span>
            <span>Số dư chỉ thay đổi sau khi <strong>tất cả thành viên</strong> duyệt yêu cầu.</span>
          </div>
          <div className="cf-dialog-actions">
            <button className="cf-btn cf-btn-quiet" type="button" onClick={onClose}>Hủy</button>
            <button className="cf-btn cf-btn-primary" type="submit">Gửi yêu cầu duyệt</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function BankDialog({ onClose }) {
  const [selectedBank, setSelectedBank] = useState(INTEGRATED_BANK.name);
  const [step, setStep] = useState("select");
  const bank = BANK_OPTIONS.find((item) => item.name === selectedBank);

  return (
    <div className="cf-overlay" onMouseDown={onClose}>
      <section
        className="cf-dialog cf-bank-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cf-bank-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="cf-dialog-head">
          <div className="cf-dialog-icon"><Icon name="bank" /></div>
          <button className="cf-icon-button" type="button" aria-label="Đóng" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        {step === "select" ? (
          <>
            <h2 id="cf-bank-title">Tích hợp tài khoản ngân hàng</h2>
            <p className="cf-dialog-copy">Chọn ngân hàng mà thủ quỹ muốn kết nối với quỹ chung.</p>
            <div className="cf-bank-options" role="group" aria-label="Chọn ngân hàng">
              {BANK_OPTIONS.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  className={`cf-bank-option ${selectedBank === item.name ? "selected" : ""}`}
                  onClick={() => setSelectedBank(item.name)}
                  aria-pressed={selectedBank === item.name}
                >
                  <span className="cf-bank-mark" style={{ "--bank-color": item.color }}>{item.short}</span>
                  <span>{item.name}</span>
                  <span className="cf-radio" />
                </button>
              ))}
            </div>
            <div className="cf-security-note">
              <Icon name="lock" />
              <span>Luồng xác thực sẽ sử dụng kênh chính thức của ngân hàng.</span>
            </div>
            <div className="cf-dialog-actions">
              <button className="cf-btn cf-btn-quiet" type="button" onClick={onClose}>Để sau</button>
              <button className="cf-btn cf-btn-primary" type="button" onClick={() => setStep("connect")}>
                Tiếp tục với {bank.name}
              </button>
            </div>
          </>
        ) : (
          <div className="cf-bank-next-step">
            <span className="cf-preview-check"><Icon name="check" /></span>
            <span className="cf-feature-kicker">Bước tiếp theo</span>
            <h2 id="cf-bank-title">Kết nối {bank.name}</h2>
            <p className="cf-dialog-copy">
              Luồng xác thực an toàn và đồng bộ giao dịch cần dịch vụ kết nối ngân hàng.
            </p>
            <div className="cf-preview-summary">
              <span className="cf-bank-mark" style={{ "--bank-color": bank.color }}>{bank.short}</span>
              <span><strong>{bank.name}</strong><small>Tài khoản quỹ chung</small></span>
            </div>
            <div className="cf-dialog-actions">
              <button className="cf-btn cf-btn-quiet" type="button" onClick={() => setStep("select")}>Quay lại</button>
              <button className="cf-btn cf-btn-primary" type="button" onClick={onClose}>Đóng</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default function CommonFund() {
  const [dialog, setDialog] = useState("");
  const [timeScale, setTimeScale] = useState("month");
  const [selectedPeriodId, setSelectedPeriodId] = useState("2026-11");
  const [pendingRequests, setPendingRequests] = useState([]);
  const [showAccountBalance, setShowAccountBalance] = useState(false);

  const total = INITIAL_CASH + INITIAL_ACCOUNT;
  const cashPercent = Math.round((INITIAL_CASH / total) * 100);
  const accountPercent = 100 - cashPercent;
  const periods = TIME_SERIES[timeScale];
  const selectedPeriod = periods.find((item) => item.id === selectedPeriodId) || periods[0];
  const largestPoint = Math.max(...selectedPeriod.points.flatMap((point) => [point.cash, point.account]));
  const chartMax = Math.ceil((largestPoint * 1.1) / 5_000_000) * 5_000_000;
  const chartTicks = [chartMax, (chartMax * 2) / 3, chartMax / 3, 0];
  const formatChartAxis = (value) => value === 0
    ? "0"
    : `${(value / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tr`;

  const submitAdjustment = (request) => {
    setPendingRequests((current) => [
      { ...request, id: crypto.randomUUID(), requestedAt: new Date().toLocaleString("vi-VN") },
      ...current,
    ]);
    setDialog("");
  };

  return (
    <div className="cf-page">
      {pendingRequests.map((pendingRequest) => (
        <section className="cf-pending" role="status" key={pendingRequest.id}>
          <span className="cf-pending-icon"><Icon name="clock" /></span>
          <div className="cf-pending-copy">
            <strong>Yêu cầu điều chỉnh đang chờ duyệt</strong>
            <span>
              {pendingRequest.source === "cash" ? "Tiền mặt" : "Tiền tài khoản"}: {formatVND(pendingRequest.currentBalance)} → {formatVND(pendingRequest.newBalance)} · {pendingRequest.reason} · Gửi lúc {pendingRequest.requestedAt}
            </span>
          </div>
          <span className="cf-pending-status">Chờ tất cả thành viên duyệt</span>
        </section>
      ))}

      <section className="cf-overview-grid">
        <article className="cf-balance-card">
          <div className="cf-balance-top">
            <div>
              <span className="cf-overline">Tổng số dư quỹ</span>
              <h3>{formatVND(total)}</h3>
            </div>
            <span className="cf-balance-mark"><Icon name="wallet" /></span>
          </div>
          <div className="cf-balance-divider" />
          <div className="cf-chart-layout">
            <div
              className="cf-donut"
              role="img"
              aria-label={`Tiền mặt ${cashPercent} phần trăm, tiền tài khoản ${accountPercent} phần trăm`}
              style={{ "--cash-percent": `${cashPercent}%` }}
            >
              <div className="cf-donut-center">
                <strong>Cơ cấu quỹ</strong>
              </div>
            </div>
            <div className="cf-legend">
              <div className="cf-legend-item">
                <span className="cf-legend-name"><i className="cf-dot cash" />Tiền mặt</span>
                <strong>{formatVND(INITIAL_CASH)}</strong>
                <small>{cashPercent}% tổng quỹ</small>
              </div>
              <div className="cf-legend-item">
                <span className="cf-legend-name"><i className="cf-dot account" />Tiền tài khoản</span>
                <strong>{formatVND(INITIAL_ACCOUNT)}</strong>
                <small>{accountPercent}% tổng quỹ</small>
              </div>
            </div>
          </div>
          <button className="cf-btn cf-btn-quiet cf-adjust-button" type="button" onClick={() => setDialog("adjust")}>
            <Icon name="sliders" /> Điều chỉnh số dư
          </button>
        </article>

        <article className="cf-wallet-card">
          <header className="cf-section-heading">
            <div>
              <span className="cf-section-icon"><Icon name="bank" /></span>
              <div>
                <h3>Ví tích hợp ngân hàng</h3>
                <p>Tài khoản được thủ quỹ kết nối với quỹ chung</p>
              </div>
            </div>
            <span className="cf-account-count">1 tài khoản</span>
          </header>

          <div className="cf-linked-account">
            <div className="cf-bank-mark cf-bank-mark-large" style={{ "--bank-color": INTEGRATED_BANK.color }}>{INTEGRATED_BANK.short}</div>
            <div className="cf-linked-main">
              <div className="cf-linked-name"><strong>{INTEGRATED_BANK.name}</strong><span className="cf-linked-badge"><i />Đã tích hợp</span></div>
              <span className="cf-linked-number">•••• •••• 4208 · Tài khoản thủ quỹ</span>
              <div className="cf-account-balance">
                <div>
                  <span>Số dư tài khoản</span>
                  <strong>{showAccountBalance ? formatVND(BANK_ACCOUNT_BALANCE) : "•••••••• ₫"}</strong>
                </div>
                <button
                  className="cf-reveal-balance"
                  type="button"
                  aria-label={showAccountBalance ? "Ẩn số dư tài khoản" : "Hiện số dư tài khoản"}
                  aria-pressed={showAccountBalance}
                  title={showAccountBalance ? "Ẩn số dư" : "Hiện số dư"}
                  onClick={() => setShowAccountBalance((visible) => !visible)}
                >
                  <Icon name={showAccountBalance ? "eye-off" : "eye"} />
                </button>
              </div>
            </div>
          </div>

          <div className="cf-account-breakdown">
            <div><span>Tiền quỹ phòng trong tài khoản</span><strong>{formatVND(INITIAL_ACCOUNT)}</strong></div>
            <div><span>Tiền riêng của thủ quỹ</span><strong>{formatVND(TREASURER_PERSONAL_BALANCE)}</strong></div>
          </div>

          <div className="cf-wallet-empty-hint">
            <Icon name="shield" /> Tài khoản này do thủ quỹ quản lý.
          </div>
          <button className="cf-add-account" type="button" onClick={() => setDialog("bank")}>
            <span><Icon name="plus" /> Tích hợp tài khoản khác</span><Icon name="chevron-right" />
          </button>
        </article>
      </section>

      <section className="cf-history-card">
        <header className="cf-history-header">
          <div>
            <h3>Lịch sử biến động</h3>
            <p>So sánh số dư tiền mặt và tài khoản theo thời gian.</p>
          </div>
          <div className="cf-history-controls">
            <div className="cf-period-tabs" role="group" aria-label="Khoảng thời gian">
              <button
                className={timeScale === "week" ? "active" : ""}
                type="button"
                aria-pressed={timeScale === "week"}
                onClick={() => { setTimeScale("week"); setSelectedPeriodId(TIME_SERIES.week[0].id); }}
              >
                Tuần
              </button>
              <button
                className={timeScale === "month" ? "active" : ""}
                type="button"
                aria-pressed={timeScale === "month"}
                onClick={() => { setTimeScale("month"); setSelectedPeriodId(TIME_SERIES.month[0].id); }}
              >
                Tháng
              </button>
            </div>
            <label className="cf-month-picker">
              <Icon name="calendar" />
              <select
                aria-label={timeScale === "week" ? "Chọn tuần" : "Chọn tháng"}
                value={selectedPeriod.id}
                onChange={(event) => setSelectedPeriodId(event.target.value)}
              >
                {periods.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
              <Icon name="chevron" />
            </label>
          </div>
        </header>
        <div className="cf-chart-legend" aria-label="Chú giải">
          <span><i className="cf-dot cash" />Tiền mặt</span>
          <span><i className="cf-dot account" />Tiền tài khoản</span>
        </div>
        <div
          className="cf-column-chart"
          role="img"
          aria-label={`${selectedPeriod.label}. ${selectedPeriod.points.map((point) => `${point.label}: tiền mặt ${formatVND(point.cash)}, tiền tài khoản ${formatVND(point.account)}`).join("; ")}`}
        >
          <div className="cf-y-axis" aria-hidden="true">
            {chartTicks.map((tick) => <span key={tick}>{formatChartAxis(tick)}</span>)}
          </div>
          <div className="cf-chart-plot">
            <div className="cf-chart-gridlines" aria-hidden="true">
              {chartTicks.map((tick) => <i key={tick} />)}
            </div>
            <div
              className={`cf-columns cf-columns-${timeScale}`}
              style={{ gridTemplateColumns: `repeat(${selectedPeriod.points.length}, minmax(0, 1fr))` }}
            >
              {selectedPeriod.points.map((point) => (
                <div className="cf-time-group" key={point.label} title={point.label}>
                  <div className="cf-time-bars">
                    <div
                      className="cf-time-bar cash-bar"
                      title={`${point.label} · Tiền mặt ${formatVND(point.cash)}`}
                      style={{ height: `${(point.cash / chartMax) * 100}%` }}
                    />
                    <div
                      className="cf-time-bar account-bar"
                      title={`${point.label} · Tiền tài khoản ${formatVND(point.account)}`}
                      style={{ height: `${(point.account / chartMax) * 100}%` }}
                    />
                  </div>
                  <span className="cf-time-label">{point.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {dialog === "adjust" && <AdjustmentDialog onClose={() => setDialog("")} onSubmit={submitAdjustment} />}
      {dialog === "bank" && <BankDialog onClose={() => setDialog("")} />}
    </div>
  );
}
