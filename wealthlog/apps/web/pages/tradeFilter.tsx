// // pages/tradefilter.tsx
// import { useEffect, useState } from "react";
// import { useRouter } from "next/router";
// import { api } from "@wealthlog/common";

// interface FxTrade {
//   amountGain?: number | null;
//   percentageGain?: number | null;
// }

// interface TradeRecord {
//   id: number;
//   tradeType: string;
//   instrument: string;
//   tradeDirection: "LONG"|"SHORT";
//   fees: number;
//   entryDate: string;
//   pattern?: string;
//   fxTrade?: FxTrade;
// }

// export default function TradeFilterPage() {
//   const router = useRouter();
//   const [error, setError] = useState("");

//   // filter fields
//   const [startDate, setStartDate] = useState("");
//   const [endDate, setEndDate] = useState("");
//   const [instrument, setInstrument] = useState("");
//   const [direction, setDirection] = useState("");
//   const [tradeType, setTradeType] = useState("");
//   const [pattern, setPattern] = useState("");

//   const [page, setPage] = useState(1);
//   const [size, setSize] = useState(10);  // 10,20,100

//   const [trades, setTrades] = useState<TradeRecord[]>([]);
//   const [total, setTotal] = useState(0);
//   const [totalPages, setTotalPages] = useState(1);

//   // aggregator
//   const [sumAmountGain, setSumAmountGain] = useState(0);
//   const [sumPercentageGain, setSumPercentageGain] = useState(0);

//   useEffect(() => {
//     doSearch();
//   // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [page, size]);

//   async function doSearch() {
//     setError("");
//     try {
//       const params = new URLSearchParams();
//       if (startDate) params.append("startDate", startDate);
//       if (endDate) params.append("endDate", endDate);
//       if (instrument) params.append("instrument", instrument);
//       if (direction) params.append("direction", direction);
//       if (tradeType) params.append("tradeType", tradeType);
//       if (pattern) params.append("pattern", pattern);
//       params.append("page", String(page));
//       params.append("size", String(size));

//       const res = await api.get(`/trade/advanced-search?${params.toString()}`);
//       const found = res.data.trades || [];
//       setTrades(found);
//       setTotal(res.data.total || 0);
//       setTotalPages(res.data.totalPages || 1);

//       // aggregator
//       let sAmount = 0;
//       let sPerc = 0;
//       for (const tr of found) {
//         if (tr.tradeType === "FX" && tr.fxTrade) {
//           if (tr.fxTrade.amountGain != null) {
//             sAmount += tr.fxTrade.amountGain;
//           }
//           if (tr.fxTrade.percentageGain != null) {
//             sPerc += tr.fxTrade.percentageGain;
//           }
//         }
//       }
//       setSumAmountGain(sAmount);
//       setSumPercentageGain(sPerc);

//     } catch (err) {
//       console.error("Failed advanced search:", err);
//       setError("Could not load advanced search trades");
//     }
//   }

//   function handleSearchSubmit(e: React.FormEvent) {
//     e.preventDefault();
//     setPage(1);
//     doSearch();
//   }
//   function handlePrev() {
//     if (page > 1) setPage(page-1);
//   }
//   function handleNext() {
//     if (page < totalPages) setPage(page+1);
//   }

//   return (
//     <div className="min-h-screen p-4 bg-gray-100">
//       <div className="max-w-4xl mx-auto bg-white p-4 rounded shadow">
//         <h1 className="text-2xl font-bold text-gray-800 mb-4">Advanced Trade Filter</h1>
//         {error && <p className="text-red-600 mb-2">{error}</p>}

//         <form onSubmit={handleSearchSubmit} className="grid grid-cols-2 gap-4">
//           <div>
//             <label className="block font-medium text-gray-700">Start Date</label>
//             <input
//               type="date"
//               className="border p-2 rounded w-full"
//               value={startDate}
//               onChange={e => setStartDate(e.target.value)}
//             />
//           </div>
//           <div>
//             <label className="block font-medium text-gray-700">End Date</label>
//             <input
//               type="date"
//               className="border p-2 rounded w-full"
//               value={endDate}
//               onChange={e => setEndDate(e.target.value)}
//             />
//           </div>
//           <div>
//             <label className="block font-medium text-gray-700">Instrument</label>
//             <input
//               type="text"
//               className="border p-2 rounded w-full"
//               value={instrument}
//               onChange={e => setInstrument(e.target.value)}
//             />
//           </div>
//           <div>
//             <label className="block font-medium text-gray-700">Direction</label>
//             <select
//               className="border p-2 rounded w-full"
//               value={direction}
//               onChange={e => setDirection(e.target.value)}
//             >
//               <option value="">Any</option>
//               <option value="Long">Long</option>
//               <option value="Short">Short</option>
//             </select>
//           </div>
//           <div>
//             <label className="block font-medium text-gray-700">Trade Type</label>
//             <select
//               className="border p-2 rounded w-full"
//               value={tradeType}
//               onChange={e => setTradeType(e.target.value)}
//             >
//               <option value="">Any</option>
//               <option value="FX">FX</option>
//               <option value="BOND">Bond</option>
//               <option value="STOCK">Stock</option>
//               <option value="CRYPTO">Crypto</option>
//             </select>
//           </div>
//           <div>
//             <label className="block font-medium text-gray-700">Pattern</label>
//             <input
//               type="text"
//               className="border p-2 rounded w-full"
//               value={pattern}
//               onChange={e => setPattern(e.target.value)}
//             />
//           </div>
//           <div>
//             <label className="block font-medium text-gray-700">Page Size</label>
//             <select
//               className="border p-2 rounded"
//               value={size}
//               onChange={e => {
//                 setSize(parseInt(e.target.value));
//                 setPage(1);
//               }}
//             >
//               <option value={10}>10</option>
//               <option value={20}>20</option>
//               <option value={100}>100</option>
//             </select>
//           </div>
//           <div className="col-span-2 flex gap-2 items-end">
//             <button
//               type="submit"
//               className="px-4 py-2 bg-blue-600 text-white rounded"
//             >
//               Search
//             </button>
//             <button
//               type="button"
//               onClick={() => router.push("/trading")}
//               className="px-4 py-2 bg-gray-500 text-white rounded"
//             >
//               Back to Trading
//             </button>
//           </div>
//         </form>

//         <div className="mt-4">
//           <p className="text-sm text-gray-600 mb-1">
//             Found {trades.length} trades (page {page}/{totalPages} | total {total})
//           </p>
//           <div className="flex gap-2">
//             <button
//               onClick={handlePrev}
//               disabled={page <= 1}
//               className="px-3 py-1 bg-gray-300 rounded disabled:opacity-50"
//             >
//               Prev
//             </button>
//             <button
//               onClick={handleNext}
//               disabled={page >= totalPages}
//               className="px-3 py-1 bg-gray-300 rounded disabled:opacity-50"
//             >
//               Next
//             </button>
//           </div>
//         </div>

//         {/* Summaries for FX */}
//         <div className="mt-4 border p-3 bg-gray-50 rounded">
//           <h3 className="font-medium text-gray-800 mb-1">FX Summaries (this page):</h3>
//           <p className="text-sm text-gray-600">Sum of FX amountGain: {sumAmountGain.toFixed(2)}</p>
//           <p className="text-sm text-gray-600">Sum of FX percentageGain: {(sumPercentageGain * 100).toFixed(2)}%</p>
//         </div>

//         {trades.length === 0 ? (
//           <p className="mt-4 text-gray-500">No trades found.</p>
//         ) : (
//           <table className="mt-4 w-full border text-sm">
//             <thead className="bg-gray-100">
//               <tr>
//                 <th className="border p-2">Date/Time</th>
//                 <th className="border p-2">Type</th>
//                 <th className="border p-2">Instrument</th>
//                 <th className="border p-2">Dir</th>
//                 <th className="border p-2">Fees</th>
//                 <th className="border p-2">Gain</th>
//                 <th className="border p-2">Pattern</th>
//               </tr>
//             </thead>
//             <tbody>
//               {trades.map(t => (
//                 <tr key={t.id}>
//                   <td className="border p-2">{new Date(t.entryDate).toLocaleString()}</td>
//                   <td className="border p-2">{t.tradeType}</td>
//                   <td className="border p-2">{t.instrument}</td>
//                   <td className="border p-2">{t.tradeDirection === "LONG" ? "Long":"Short"}</td>
//                   <td className="border p-2">{t.fees}</td>
//                   <td className="border p-2">
//                     {t.tradeType === "FX" && t.fxTrade
//                       ? t.fxTrade.percentageGain != null
//                         ? (t.fxTrade.percentageGain * 100).toFixed(2) + "%"
//                         : t.fxTrade.amountGain != null
//                           ? "$" + t.fxTrade.amountGain
//                           : ""
//                       : ""
//                     }
//                   </td>
//                   <td className="border p-2">{t.pattern || ""}</td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         )}
//       </div>
//     </div>
//   );
// }
