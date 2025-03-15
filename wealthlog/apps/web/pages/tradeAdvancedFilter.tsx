import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { api, setAccessToken } from "@wealthlog/common";

interface Trade {
  id: number;
  instrument: string;
  session: string;
  percentage?: number;
  amount?: number;
  fees: number;
  dateTime: string; // ISO
  pattern: string;
  direction: "Long" | "Short";
}

export default function TradeAdvancedFilter() {
  const router = useRouter();

  // FILTER STATES
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [instrument, setInstrument] = useState("");
  const [pattern, setPattern] = useState("");
  const [direction, setDirection] = useState("");
  const [session, setSession] = useState("");

  // PAGINATION
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);

  // RESULTS
  const [trades, setTrades] = useState<Trade[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // For errors and dropdown data
  const [error, setError] = useState("");
  const [instrumentsList, setInstrumentsList] = useState<string[]>([]);
  const [patternsList, setPatternsList] = useState<string[]>([]);

  // Fetch instruments/patterns from /settings to populate dropdowns
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    api
      .get("/settings", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        setInstrumentsList(res.data.instruments || []);
        setPatternsList(res.data.patterns || []);
      })
      .catch((err) => {
        console.error("Failed to fetch settings dropdown data.", err);
      });
  }, [router]);

  // The main search function (AND logic)
  const doSearch = async () => {
    setError("");
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      // Build query string
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (instrument) params.append("instrument", instrument);
      if (pattern) params.append("pattern", pattern);
      if (direction) params.append("direction", direction);
      if (session) params.append("session", session);

      params.append("page", String(page));
      params.append("size", String(size));

      const res = await api.get(`/trades/advanced-search?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // expects { trades, total, page, size, totalPages }
      setTrades(res.data.trades || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error(err);
      setError("Failed to search trades.");
    }
  };

  // When page or size changes, re-run doSearch
  useEffect(() => {
    doSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, size]);

  // Summaries
  const count = trades.length;
  const totalPercentage = trades.reduce((acc, t) => acc + (t.percentage || 0), 0);
  const totalAmount = trades.reduce((acc, t) => acc + (t.amount || 0), 0);

  // Handlers
  const handleSearchClick = () => {
    setPage(1); // go back to page 1 on new search
    doSearch();
  };

  const handleSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSize(Number(e.target.value));
    setPage(1);
  };

  const handleNextPage = () => {
    if (page < totalPages) setPage(page + 1);
  };

  const handlePrevPage = () => {
    if (page > 1) setPage(page - 1);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Advanced Trade Filter (AND logic)</h1>
      {error && <p className="text-red-500">{error}</p>}

      {/* FILTER FORM */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Date range */}
        <div>
          <label className="block">Start Date:</label>
          <input
            type="date"
            className="p-2 border rounded w-full"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label className="block">End Date:</label>
          <input
            type="date"
            className="p-2 border rounded w-full"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        {/* Instrument Dropdown */}
        <div>
          <label className="block">Instrument:</label>
          <select
            className="p-2 border rounded w-full"
            value={instrument}
            onChange={(e) => setInstrument(e.target.value)}
          >
            <option value="">Any</option>
            {instrumentsList.map((inst) => (
              <option key={inst} value={inst}>
                {inst}
              </option>
            ))}
          </select>
        </div>

        {/* Pattern Dropdown */}
        <div>
          <label className="block">Pattern:</label>
          <select
            className="p-2 border rounded w-full"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
          >
            <option value="">Any</option>
            {patternsList.map((pat) => (
              <option key={pat} value={pat}>
                {pat}
              </option>
            ))}
          </select>
        </div>

        {/* Direction */}
        <div>
          <label className="block">Direction:</label>
          <select
            className="p-2 border rounded w-full"
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
          >
            <option value="">Any</option>
            <option value="Long">Long</option>
            <option value="Short">Short</option>
          </select>
        </div>

        {/* Session */}
        <div>
          <label className="block">Session:</label>
          <select
            className="p-2 border rounded w-full"
            value={session}
            onChange={(e) => setSession(e.target.value)}
          >
            <option value="">Any</option>
            <option value="London">London</option>
            <option value="US">US</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      <button
        onClick={handleSearchClick}
        className="mt-4 bg-blue-500 text-white py-2 px-4 rounded"
      >
        Search
      </button>

      {/* PAGE SIZE */}
      <div className="mt-4 flex items-center gap-2">
        <label>Page Size:</label>
        <select
          value={size}
          onChange={handleSizeChange}
          className="p-2 border rounded"
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
      </div>

      {/* PAGINATION */}
      <div className="mt-2 flex items-center gap-4">
        <button
          onClick={handlePrevPage}
          disabled={page <= 1}
          className="bg-gray-300 px-3 py-1 rounded disabled:opacity-50"
        >
          Prev
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button
          onClick={handleNextPage}
          disabled={page >= totalPages}
          className="bg-gray-300 px-3 py-1 rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>

      {/* SUMMARY */}
      <div className="mt-6 p-4 border rounded bg-gray-50">
        <h2 className="text-lg font-semibold mb-2">Summary of Filtered Trades</h2>
        <p>Total Trades (page subset): {trades.length}</p>
        <p>Total Percentage (page subset): {totalPercentage.toFixed(2)}%</p>
        <p>Total Amount (page subset): ${totalAmount.toFixed(2)}</p>
      </div>

      {/* RESULTS TABLE */}
      <h2 className="text-lg font-semibold mt-4">Search Results</h2>
      <p className="text-sm text-gray-600 mb-2">
        Showing {trades.length} trades out of {total} total
      </p>

      {trades.length === 0 ? (
        <p>No trades found.</p>
      ) : (
        <table className="w-full mt-2 border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">Date/Time</th>
              <th className="border p-2">Instrument</th>
              <th className="border p-2">Direction</th>
              <th className="border p-2">Session</th>
              <th className="border p-2">Pattern</th>
              <th className="border p-2">Fees</th>
              <th className="border p-2">%</th>
              <th className="border p-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((t) => (
              <tr key={t.id}>
                <td className="border p-2">
                  {new Date(t.dateTime).toLocaleString()}
                </td>
                <td className="border p-2">{t.instrument}</td>
                <td className="border p-2">{t.direction}</td>
                <td className="border p-2">{t.session}</td>
                <td className="border p-2">{t.pattern}</td>
                <td className="border p-2">${t.fees.toFixed(2)}</td>
                <td className="border p-2">{t.percentage?.toFixed(2) ?? 0}%</td>
                <td className="border p-2">${t.amount?.toFixed(2) ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
