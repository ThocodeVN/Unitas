import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import Icon from "../components/Icon";
import { formatVND } from "../utils/format";
import {
  approveAdjustment,
  cancelAdjustment,
  createAdjustment,
  createTransfer,
  getFund,
  getFundHistory,
  listAdjustments,
  rejectAdjustment,
} from "../services/fundApi";
import "../styles/commonFund.css";

// Phần ví ngân hàng chưa làm backend: các số dưới đây chỉ là số liệu mẫu
const DEMO_BANK_BALANCE = 25_800_000;
const DEMO_FUND_IN_ACCOUNT = 13_250_000;
const DEMO_TREASURER_PERSONAL = DEMO_BANK_BALANCE - DEMO_FUND_IN_ACCOUNT;

const SOURCE_KEY = { cash: "CASH", account: "ACCOUNT" };
const SOURCE_TEXT = { CASH: "Tiền mặt", ACCOUNT: "Tiền tài khoản" };

const INTEGRATED_BANK = { name: "Vietcombank", short: "VCB", color: "#08784e" };
const BANK_OPTIONS = [
  INTEGRATED_BANK,
  { name: "BIDV", short: "BIDV", color: "#1c4d9b" },
  { name: "Techcombank", short: "TCB", color: "#d9272e" },
  { name: "MB Bank", short: "MB", color: "#173e82" },
];

function AdjustmentDialog({ cash, account, onClose, onSubmit }) {
  const [source, setSource] = useState("account");
  const [newBalance, setNewBalance] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const currentBalance = source === "cash" ? cash : account;

  const submit = async (event) => {
    event.preventDefault();
    const value = Number(newBalance);
    if (!Number.isInteger(value) || value < 0 || !reason.trim()) {
      setError("Số dư mới phải là số nguyên không âm.");
      return;
    }
    if (value === currentBalance) {
      setError("Số dư mới phải khác số dư hiện tại.");
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        source: SOURCE_KEY[source],
        newBalance: value,
        reason: reason.trim(),
      });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
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
            <button className="cf-btn cf-btn-primary" type="submit" disabled={busy}>
              {busy ? "Đang gửi…" : "Gửi yêu cầu duyệt"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

// Chuyển giữa tiền mặt và tài khoản: tổng quỹ không đổi
function TransferDialog({ cash, account, onClose, onDone }) {
  const [from, setFrom] = useState(cash > 0 || account === 0 ? "CASH" : "ACCOUNT");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const available = from === "CASH" ? cash : account;
  const value = Number(amount) || 0;
  const nextCash = from === "CASH" ? cash - value : cash + value;
  const nextAccount = from === "CASH" ? account + value : account - value;

  const submit = async (event) => {
    event.preventDefault();
    if (!Number.isInteger(value) || value < 1000) {
      setError("Số tiền phải là số nguyên từ 1.000 ₫ trở lên.");
      return;
    }
    if (value > available) {
      setError(`Chỉ có thể chuyển tối đa ${formatVND(available)}.`);
      return;
    }
    setBusy(true);
    try {
      await onDone(await createTransfer({ from, amount: value, note: note.trim() }));
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="cf-overlay" onMouseDown={onClose}>
      <section
        className="cf-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cf-transfer-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="cf-dialog-head">
          <div className="cf-dialog-icon"><Icon name="swap" /></div>
          <button className="cf-icon-button" type="button" aria-label="Đóng" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        <h2 id="cf-transfer-title">Chuyển tiền mặt ↔ tài khoản</h2>
        <p className="cf-dialog-copy">
          Ghi lại khi bạn nộp tiền mặt vào ngân hàng hoặc rút tiền ra. Tổng quỹ không đổi.
        </p>

        <form className="cf-form" onSubmit={submit}>
          <label className="cf-field-label" htmlFor="cf-transfer-from">Chiều chuyển</label>
          <select
            id="cf-transfer-from"
            value={from}
            onChange={(event) => { setFrom(event.target.value); setError(""); }}
          >
            <option value="CASH">Nộp tiền mặt vào tài khoản</option>
            <option value="ACCOUNT">Rút từ tài khoản ra tiền mặt</option>
          </select>

          <label className="cf-field-label" htmlFor="cf-transfer-amount">
            Số tiền · có thể chuyển {formatVND(available)}
          </label>
          <div className="cf-input-wrap">
            <input
              id="cf-transfer-amount"
              inputMode="numeric"
              min="1000"
              max={available}
              placeholder="Nhập số tiền"
              required
              type="number"
              value={amount}
              onChange={(event) => { setAmount(event.target.value); setError(""); }}
            />
            <span>₫</span>
          </div>

          <label className="cf-field-label" htmlFor="cf-transfer-note">Ghi chú (không bắt buộc)</label>
          <textarea
            id="cf-transfer-note"
            maxLength="150"
            placeholder="VD: Nộp tiền điện tháng 11 vào tài khoản"
            rows="2"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />

          {value > 0 && value <= available && (
            <div className="cf-transfer-preview">
              Sau khi chuyển: Tiền mặt <strong>{formatVND(nextCash)}</strong> · Tài khoản{" "}
              <strong>{formatVND(nextAccount)}</strong>
            </div>
          )}

          {error && <div className="cf-form-error" role="alert">{error}</div>}

          <div className="cf-dialog-actions">
            <button className="cf-btn cf-btn-quiet" type="button" onClick={onClose}>Hủy</button>
            <button className="cf-btn cf-btn-primary" type="submit" disabled={busy || available === 0}>
              {busy ? "Đang chuyển…" : "Xác nhận chuyển"}
            </button>
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
  const { isTreasurer } = useOutletContext();
  const [dialog, setDialog] = useState("");
  const [busyId, setBusyId] = useState(""); // yêu cầu đang được duyệt/từ chối/hủy
  const [timeScale, setTimeScale] = useState("month");
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [pendingRequests, setPendingRequests] = useState([]);
  const [showAccountBalance, setShowAccountBalance] = useState(false);
  const [fund, setFund] = useState(null); // { cash, account }
  const [history, setHistory] = useState(null); // { periods, period }
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0); // tăng lên để tải lại số dư và biểu đồ

  // Số dư và các yêu cầu điều chỉnh đang chờ
  useEffect(() => {
    let active = true;
    Promise.all([getFund(), listAdjustments()])
      .then(([f, a]) => {
        if (!active) return;
        setFund({ cash: f.cashBalance, account: f.accountBalance });
        setPendingRequests(a.adjustments.filter((x) => x.status === "PENDING"));
        setError("");
      })
      .catch((err) => active && setError(err.message));
    return () => {
      active = false;
    };
  }, [reload]);

  // Biểu đồ theo tuần/tháng đang chọn
  useEffect(() => {
    let active = true;
    getFundHistory(timeScale, selectedPeriodId)
      .then((data) => active && setHistory(data))
      .catch((err) => active && setError(err.message));
    return () => {
      active = false;
    };
  }, [timeScale, selectedPeriodId, reload]);

  const cash = fund?.cash ?? 0;
  const account = fund?.account ?? 0;
  const total = cash + account;
  const cashPercent = total > 0 ? Math.round((cash / total) * 100) : 0;
  const accountPercent = total > 0 ? 100 - cashPercent : 0;
  const periods = history?.periods ?? [];
  const selectedPeriod = history?.period ?? { id: "", label: "", points: [] };
  const largestPoint = Math.max(0, ...selectedPeriod.points.flatMap((point) => [point.cash, point.account]));
  const chartMax = Math.max(1_000_000, Math.ceil((largestPoint * 1.1) / 5_000_000) * 5_000_000);
  const chartTicks = [chartMax, (chartMax * 2) / 3, chartMax / 3, 0];
  const formatChartAxis = (value) => value === 0
    ? "0"
    : `${(value / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tr`;

  // Ném lỗi ra để hộp thoại hiện thông báo dưới form
  const submitAdjustment = async (payload) => {
    const { adjustment } = await createAdjustment(payload);
    setDialog("");
    // Phòng chỉ có một người thì được áp dụng ngay, tải lại số dư và biểu đồ
    if (adjustment.status === "PENDING") {
      setPendingRequests((current) => [adjustment, ...current]);
    } else {
      setReload((n) => n + 1);
    }
  };

  // Hủy (thủ quỹ), duyệt hoặc từ chối (thành viên) một yêu cầu đang chờ
  const actOnRequest = async (id, action) => {
    setBusyId(id);
    try {
      const { adjustment } = await action(id);
      if (adjustment.status === "PENDING") {
        setPendingRequests((current) =>
          current.map((item) => (item._id === id ? adjustment : item)),
        );
      } else {
        setPendingRequests((current) => current.filter((item) => item._id !== id));
        // Đủ người duyệt thì số dư đã đổi
        if (adjustment.status === "APPROVED") setReload((n) => n + 1);
      }
    } catch (err) {
      setError(err.message);
      setReload((n) => n + 1);
    } finally {
      setBusyId("");
    }
  };

  const changeScale = (scale) => {
    setTimeScale(scale);
    setSelectedPeriodId("");
  };

  return (
    <div className="cf-page">
      {error && (
        <div className="cf-form-error" role="alert">
          {error}{" "}
          <button className="cf-btn cf-btn-quiet" type="button" onClick={() => { setError(""); setReload((n) => n + 1); }}>
            Thử lại
          </button>
        </div>
      )}

      {pendingRequests.map((pendingRequest) => (
        <section className="cf-pending" role="status" key={pendingRequest._id}>
          <span className="cf-pending-icon"><Icon name="clock" /></span>
          <div className="cf-pending-copy">
            <strong>
              {isTreasurer
                ? "Yêu cầu điều chỉnh đang chờ duyệt"
                : `${pendingRequest.requestedBy?.fullName || "Thủ quỹ"} đề nghị điều chỉnh số dư`}
            </strong>
            <span>
              {SOURCE_TEXT[pendingRequest.source]}: {formatVND(pendingRequest.oldBalance)} → {formatVND(pendingRequest.newBalance)} · {pendingRequest.reason} · Gửi lúc {new Date(pendingRequest.createdAt).toLocaleString("vi-VN")}
            </span>
          </div>
          <span className="cf-pending-status">
            Đã duyệt {pendingRequest.approvedCount}/{pendingRequest.memberCount} thành viên
          </span>
          {isTreasurer ? (
            <button
              className="cf-btn cf-btn-quiet"
              type="button"
              disabled={busyId === pendingRequest._id}
              onClick={() => actOnRequest(pendingRequest._id, cancelAdjustment)}
            >
              Hủy
            </button>
          ) : pendingRequest.myApproved ? (
            <span className="cf-pending-status">Bạn đã duyệt</span>
          ) : (
            <>
              <button
                className="cf-btn cf-btn-quiet"
                type="button"
                disabled={busyId === pendingRequest._id}
                onClick={() => actOnRequest(pendingRequest._id, rejectAdjustment)}
              >
                Từ chối
              </button>
              <button
                className="cf-btn cf-btn-primary"
                type="button"
                disabled={busyId === pendingRequest._id}
                onClick={() => actOnRequest(pendingRequest._id, approveAdjustment)}
              >
                Duyệt
              </button>
            </>
          )}
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
                <strong>{formatVND(cash)}</strong>
                <small>{cashPercent}% tổng quỹ</small>
              </div>
              <div className="cf-legend-item">
                <span className="cf-legend-name"><i className="cf-dot account" />Tiền tài khoản</span>
                <strong>{formatVND(account)}</strong>
                <small>{accountPercent}% tổng quỹ</small>
              </div>
            </div>
          </div>
          {isTreasurer && (
            <div className="cf-balance-actions">
              <button className="cf-btn cf-btn-quiet cf-adjust-button" type="button" onClick={() => setDialog("transfer")}>
                <Icon name="swap" /> Chuyển đổi
              </button>
              <button className="cf-btn cf-btn-quiet cf-adjust-button" type="button" onClick={() => setDialog("adjust")}>
                <Icon name="sliders" /> Điều chỉnh số dư
              </button>
            </div>
          )}
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
              {isTreasurer && (
              <div className="cf-account-balance">
                <div>
                  <span>Số dư tài khoản</span>
                  <strong>{showAccountBalance ? formatVND(DEMO_BANK_BALANCE) : "•••••••• ₫"}</strong>
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
              )}
            </div>
          </div>

          <div className="cf-account-breakdown">
            <div><span>Tiền quỹ phòng trong tài khoản</span><strong>{formatVND(DEMO_FUND_IN_ACCOUNT)}</strong></div>
            {isTreasurer && (
              <div><span>Tiền riêng của thủ quỹ</span><strong>{formatVND(DEMO_TREASURER_PERSONAL)}</strong></div>
            )}
          </div>

          <div className="cf-wallet-empty-hint">
            <Icon name="shield" /> Tài khoản này do thủ quỹ quản lý.
          </div>
          {isTreasurer && (
            <button className="cf-add-account" type="button" onClick={() => setDialog("bank")}>
              <span><Icon name="plus" /> Tích hợp tài khoản khác</span><Icon name="chevron-right" />
            </button>
          )}
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
                onClick={() => changeScale("week")}
              >
                Tuần
              </button>
              <button
                className={timeScale === "month" ? "active" : ""}
                type="button"
                aria-pressed={timeScale === "month"}
                onClick={() => changeScale("month")}
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

      {dialog === "adjust" && <AdjustmentDialog cash={cash} account={account} onClose={() => setDialog("")} onSubmit={submitAdjustment} />}
      {dialog === "bank" && <BankDialog onClose={() => setDialog("")} />}
      {dialog === "transfer" && (
        <TransferDialog
          cash={cash}
          account={account}
          onClose={() => setDialog("")}
          onDone={(result) => {
            setFund({ cash: result.cashBalance, account: result.accountBalance });
            setDialog("");
            setReload((n) => n + 1); // vẽ lại biểu đồ
          }}
        />
      )}
    </div>
  );
}
