import { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceDot, ResponsiveContainer, Legend,
} from "recharts";

const START_YEAR = 2026;
const MAX_MONTHS = 360;

function fmtMoney(n) {
  if (n == null || isNaN(n)) return "—";
  if (Math.abs(n) >= 1000000) return "$" + (n / 1000000).toFixed(2) + "m";
  if (Math.abs(n) >= 1000) return "$" + Math.round(n / 1000) + "k";
  return "$" + Math.round(n);
}
function fmtFull(n) {
  return "$" + Math.round(n).toLocaleString();
}

function simulate({ balance, homeRate, yearsLeft, equity, investRate, returnRate }) {
  const iH = homeRate / 100 / 12;
  const iR = returnRate / 100 / 12;
  const n = Math.max(1, Math.round(yearsLeft * 12));
  const pay = iH > 0 ? (balance * iH) / (1 - Math.pow(1 + iH, -n)) : balance / n;

  let homeBal = balance;
  let inv = equity;
  let baselineMonth = null;
  let strategyMonth = null;
  let holdCost = 0;
  const points = [{ year: START_YEAR, baseline: balance, netDebt: balance + equity - equity, invest: equity }];

  for (let m = 1; m <= MAX_MONTHS; m++) {
    if (homeBal > 0) {
      homeBal = homeBal * (1 + iH) - pay;
      if (homeBal <= 0) {
        homeBal = 0;
        if (baselineMonth === null) baselineMonth = m;
      }
    }
    inv = inv * (1 + iR);
    if (strategyMonth === null) {
      holdCost += (equity * (investRate / 100)) / 12;
      if (inv >= homeBal + equity) strategyMonth = m;
    }
    if (m % 12 === 0) {
      points.push({
        year: START_YEAR + m / 12,
        baseline: Math.round(homeBal),
        netDebt: Math.round(Math.max(0, strategyMonth !== null && m >= strategyMonth ? 0 : homeBal + equity - inv)),
        invest: Math.round(inv),
      });
    }
  }
  return { baselineMonth, strategyMonth, holdCost, points, monthlyRepay: pay };
}

function monthToYear(m) {
  if (m === null) return null;
  return START_YEAR + m / 12;
}

const S = {
  label: { display: "block", fontSize: 12, fontWeight: 600, color: "#5A6B80", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 6 },
  input: { width: "100%", border: "1px solid #D4DAE1", borderRadius: 6, padding: "9px 11px", fontSize: 15, fontFamily: "'IBM Plex Mono', monospace", color: "#16243A", background: "#fff" },
  row: { marginBottom: 16 },
};

function Field({ label, value, onChange, prefix, suffix, min, max, step }) {
  return (
    <div style={S.row}>
      <label style={S.label}>{label}</label>
      <div style={{ position: "relative" }}>
        {prefix && (
          <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#8A97A6", fontFamily: "'IBM Plex Mono', monospace", fontSize: 14 }}>{prefix}</span>
        )}
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step || 1}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          style={{ ...S.input, paddingLeft: prefix ? 26 : 11, paddingRight: suffix ? 60 : 11 }}
        />
        {suffix && (
          <span style={{ position: "absolute", right: 11, top: "50%", transform: "translateY(-50%)", color: "#8A97A6", fontSize: 12 }}>{suffix}</span>
        )}
      </div>
    </div>
  );
}

export default function EquityAccelerator() {
  const [houseValue, setHouseValue] = useState(850000);
  const [balance, setBalance] = useState(520000);
  const [homeRate, setHomeRate] = useState(6.0);
  const [yearsLeft, setYearsLeft] = useState(25);
  const [investRate, setInvestRate] = useState(6.5);
  const [returnRate, setReturnRate] = useState(8);
  const [investAmt, setInvestAmt] = useState(null);

  const usableEquity = Math.max(0, Math.round(houseValue * 0.8 - balance));
  const equity = Math.min(investAmt === null ? usableEquity : Math.max(0, investAmt), usableEquity);

  const result = useMemo(
    () => simulate({ balance, homeRate, yearsLeft, equity, investRate, returnRate }),
    [balance, homeRate, yearsLeft, equity, investRate, returnRate]
  );
  const downside = useMemo(
    () => simulate({ balance, homeRate, yearsLeft, equity, investRate, returnRate: 5 }),
    [balance, homeRate, yearsLeft, equity, investRate]
  );

  const baseYear = monthToYear(result.baselineMonth);
  const stratYear = monthToYear(result.strategyMonth);
  const downYear = monthToYear(downside.strategyMonth);
  const yearsSaved = baseYear && stratYear ? baseYear - stratYear : null;
  const wins = yearsSaved !== null && yearsSaved > 0.05;
  const monthlyHold = (equity * (investRate / 100)) / 12;

  const verdictColor = wins ? "#0A6B4F" : "#B23B2E";

  return (
    <div style={{ minHeight: "100vh", background: "#F2F4F6", color: "#16243A", fontFamily: "'Public Sans', sans-serif", padding: "32px 16px 56px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Public+Sans:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        input[type=range] { width: 100%; accent-color: #0A6B4F; }
        input:focus { outline: 2px solid #16243A; outline-offset: 1px; }
        .grid { display: grid; grid-template-columns: 320px 1fr; gap: 24px; }
        @media (max-width: 820px) { .grid { grid-template-columns: 1fr; } }
        .strike { text-decoration: line-through; text-decoration-thickness: 2px; text-decoration-color: #B23B2E; color: #8A97A6; }
      `}</style>

      <div style={{ maxWidth: 1020, margin: "0 auto" }}>
        <header style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.14em", color: "#9C7C3C", marginBottom: 8 }}>
            ASSIST LOANS · EQUITY MODELLER
          </div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 34, fontWeight: 600, margin: 0, lineHeight: 1.15 }}>
            Does borrowing to invest get you debt-free sooner?
          </h1>
          <p style={{ color: "#5A6B80", fontSize: 15, maxWidth: 640, lineHeight: 1.6, marginTop: 10 }}>
            Model pulling usable equity from your home, paying interest on it, and investing the lump sum. Every assumption below is yours to change — the answer depends entirely on them.
          </p>
        </header>

        <div className="grid">
          {/* Inputs */}
          <div style={{ background: "#fff", border: "1px solid #E1E6EB", borderRadius: 10, padding: "22px 20px", alignSelf: "start" }}>
            <Field label="Property value" value={houseValue} onChange={setHouseValue} prefix="$" step={10000} min={0} />
            <Field label="Current home loan balance" value={balance} onChange={setBalance} prefix="$" step={10000} min={0} />
            <Field label="Home loan rate" value={homeRate} onChange={setHomeRate} suffix="% p.a." step={0.05} min={0} max={15} />
            <Field label="Years remaining on loan" value={yearsLeft} onChange={setYearsLeft} suffix="years" min={1} max={30} />

            <div style={{ borderTop: "1px dashed #D4DAE1", margin: "18px 0 16px" }} />

            <div style={{ ...S.row }}>
              <label style={S.label}>Usable equity (80% LVR)</label>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 20, fontWeight: 500, color: usableEquity > 0 ? "#0A6B4F" : "#B23B2E" }}>
                {fmtFull(usableEquity)}
              </div>
              {usableEquity === 0 && (
                <div style={{ fontSize: 12.5, color: "#B23B2E", marginTop: 4 }}>
                  No usable equity at 80% LVR yet — this strategy isn't available to you today.
                </div>
              )}
            </div>

            <Field label="Amount to invest" value={equity} onChange={setInvestAmt} prefix="$" step={5000} min={0} max={usableEquity} />
            <Field label="Investment loan rate" value={investRate} onChange={setInvestRate} suffix="% p.a." step={0.05} min={0} max={15} />

            <div style={S.row}>
              <label style={S.label}>Assumed average return: {returnRate.toFixed(1)}% p.a.</label>
              <input
                type="range"
                min={0}
                max={15}
                step={0.5}
                value={returnRate}
                onChange={(e) => setReturnRate(parseFloat(e.target.value))}
                aria-label="Assumed average annual return"
              />
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                {[5, 8, 12].map((r) => (
                  <button
                    key={r}
                    onClick={() => setReturnRate(r)}
                    style={{
                      flex: 1, padding: "6px 0", fontSize: 12.5, fontWeight: 600, borderRadius: 6, cursor: "pointer",
                      border: returnRate === r ? "1.5px solid #16243A" : "1px solid #D4DAE1",
                      background: returnRate === r ? "#16243A" : "#fff",
                      color: returnRate === r ? "#fff" : "#5A6B80",
                    }}
                  >
                    {r}%
                  </button>
                ))}
              </div>
              {returnRate > 10 && (
                <div style={{ fontSize: 12.5, color: "#9C6A12", background: "#FBF3E2", border: "1px solid #EAD9B0", borderRadius: 6, padding: "8px 10px", marginTop: 10, lineHeight: 1.5 }}>
                  Australian shares have averaged roughly 9–10% a year long-run, including dividends. Assuming more than 10% is aggressive — be ready to justify it.
                </div>
              )}
            </div>
          </div>

          {/* Output */}
          <div>
            {/* Verdict strip */}
            <div style={{ background: "#fff", border: "1px solid #E1E6EB", borderLeft: `4px solid ${verdictColor}`, borderRadius: 10, padding: "18px 22px", marginBottom: 16 }}>
              {equity <= 0 ? (
                <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, color: "#5A6B80" }}>Enter your figures to run the comparison.</div>
              ) : wins ? (
                <div>
                  <div style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 600, lineHeight: 1.3 }}>
                    Debt-free in <span className="strike">{Math.ceil(baseYear)}</span>{" "}
                    <span style={{ color: "#0A6B4F" }}>{Math.ceil(stratYear)}</span>
                    <span style={{ fontSize: 17, color: "#5A6B80", fontWeight: 500 }}> — about {yearsSaved.toFixed(1)} years sooner</span>
                  </div>
                  <div style={{ fontSize: 13.5, color: "#5A6B80", marginTop: 8, lineHeight: 1.6 }}>
                    If returns average that {returnRate.toFixed(1)}% every year. Holding cost: <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{fmtMoney(monthlyHold)}/mo</span> from your cash flow until the crossover.
                    {" "}If returns average only 5%: debt-free {downYear ? `in ${Math.ceil(downYear)}` : "not within 30 years"}.
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 600, color: "#B23B2E", lineHeight: 1.3 }}>
                    At {returnRate.toFixed(1)}% return vs {investRate.toFixed(1)}% borrowing, this strategy doesn't get you there sooner.
                  </div>
                  <div style={{ fontSize: 13.5, color: "#5A6B80", marginTop: 8, lineHeight: 1.6 }}>
                    Staying the course pays your home off {baseYear ? `in ${Math.ceil(baseYear)}` : "—"}; the leveraged path {stratYear ? `clears in ${Math.ceil(stratYear)}` : "doesn't clear within 30 years"} and costs <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{fmtMoney(monthlyHold)}/mo</span> to hold. Borrowing certain interest for uncertain returns only works when the gap is real.
                  </div>
                </div>
              )}
            </div>

            {/* Chart */}
            <div style={{ background: "#fff", border: "1px solid #E1E6EB", borderRadius: 10, padding: "20px 12px 8px" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#5A6B80", letterSpacing: "0.04em", textTransform: "uppercase", margin: "0 0 4px 12px" }}>
                Path to zero debt
              </div>
              <ResponsiveContainer width="100%" height={340}>
                <LineChart data={result.points} margin={{ top: 12, right: 20, bottom: 4, left: 8 }}>
                  <CartesianGrid stroke="#EDF0F3" vertical={false} />
                  <XAxis dataKey="year" tick={{ fontSize: 12, fill: "#8A97A6", fontFamily: "'IBM Plex Mono', monospace" }} tickLine={false} axisLine={{ stroke: "#D4DAE1" }} />
                  <YAxis tickFormatter={fmtMoney} tick={{ fontSize: 12, fill: "#8A97A6", fontFamily: "'IBM Plex Mono', monospace" }} tickLine={false} axisLine={false} width={56} />
                  <Tooltip
                    formatter={(v, name) => [fmtFull(v), name]}
                    labelStyle={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500 }}
                    contentStyle={{ borderRadius: 8, border: "1px solid #E1E6EB", fontSize: 13 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 13 }} />
                  <Line type="monotone" dataKey="baseline" name="Stay the course (home loan)" stroke="#5A6B80" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="netDebt" name="Equity strategy (net debt)" stroke={verdictColor} strokeWidth={2.5} dot={false} />
                  {result.baselineMonth && (
                    <ReferenceDot x={Math.round(START_YEAR + result.baselineMonth / 12)} y={0} r={5} fill="#5A6B80" stroke="#fff" strokeWidth={2} />
                  )}
                  {result.strategyMonth && (
                    <ReferenceDot x={Math.round(START_YEAR + result.strategyMonth / 12)} y={0} r={5} fill={verdictColor} stroke="#fff" strokeWidth={2} />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Stats */}
            <div style={{ display: "flex", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
              {[
                { l: "Monthly repayment (home)", v: fmtMoney(result.monthlyRepay) + "/mo" },
                { l: "Equity loan holding cost", v: fmtMoney(monthlyHold) + "/mo" },
                { l: "Interest paid to hold strategy", v: fmtMoney(result.holdCost) },
              ].map((s) => (
                <div key={s.l} style={{ flex: "1 1 150px", background: "#fff", border: "1px solid #E1E6EB", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#8A97A6", textTransform: "uppercase", letterSpacing: "0.04em" }}>{s.l}</div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 17, marginTop: 4 }}>{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <footer style={{ marginTop: 28, fontSize: 12.5, color: "#7B8898", lineHeight: 1.7, maxWidth: 880, borderTop: "1px solid #E1E6EB", paddingTop: 16 }}>
          General information only — not financial, credit or tax advice, and no specific investment is being recommended. This model assumes a constant annual return, which no real investment delivers; actual returns vary year to year and can be negative. It ignores tax, transaction and ongoing costs, rate changes, and currency risk. Borrowing to invest magnifies losses as well as gains: the interest is certain, the return is not. Figures are estimates only. Consider advice from a licensed adviser before acting. All assumptions in this tool are adjustable and the results depend entirely on the assumptions you choose.
        </footer>
      </div>
    </div>
  );
}
