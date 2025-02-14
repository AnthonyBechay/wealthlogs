import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { api } from "../utils/api";

export default function Settings() {
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);
  const [amount, setAmount] = useState(0);
  const [instruments, setInstruments] = useState<string[]>([]);
  const [patterns, setPatterns] = useState<string[]>([]);
  const [newInstrument, setNewInstrument] = useState("");
  const [newPattern, setNewPattern] = useState("");
  const [beRange, setBeRange] = useState({ min: -0.2, max: 0.3 });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    } else {
      fetchAccountBalance(token);
      fetchSettings(token);
    }
  }, []);

  const fetchAccountBalance = async (token: string) => {
    try {
      const response = await api.get("/account", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBalance(response.data.accountBalance ?? 0);
    } catch (err) {
      console.error("Failed to fetch balance.");
      setBalance(0);
    }
  };

  const fetchSettings = async (token: string) => {
    try {
      const response = await api.get("/settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInstruments(response.data.instruments || []);
      setPatterns(response.data.patterns || []);
      setBeRange({ min: response.data.beMin, max: response.data.beMax });
    } catch (err) {
      console.error("Failed to fetch settings.");
    }
  };

  const handleAddMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    try {
      await api.post("/account/add", { amount }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchAccountBalance(token!);
      setAmount(0);
    } catch (err) {
      console.error("Failed to add money.");
    }
  };

  const handleUpdateSettings = async () => {
    const token = localStorage.getItem("token");
    try {
      await api.post("/settings/update", {
        instruments, patterns, beMin: beRange.min, beMax: beRange.max
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error("Failed to update settings.");
    }
  };

  const handleAddInstrument = () => {
    if (newInstrument.trim() !== "") {
      setInstruments([...instruments, newInstrument]);
      setNewInstrument("");
    }
  };

  const handleAddPattern = () => {
    if (newPattern.trim() !== "") {
      setPatterns([...patterns, newPattern]);
      setNewPattern("");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Account Balance Section */}
      <div className="mt-6 p-4 border rounded">
        <h2 className="text-lg font-semibold">Account Balance: ${balance !== null ? balance.toFixed(2) : "Loading..."}</h2>
        <form onSubmit={handleAddMoney} className="mt-4">
          <label>Add Money:</label>
          <input type="number" className="w-full p-2 border rounded" value={amount} onChange={(e) => setAmount(Number(e.target.value))} required />
          <button type="submit" className="w-full mt-4 bg-green-500 text-white py-2 rounded">Add Money</button>
        </form>
      </div>

      {/* Instruments Section */}
      <div className="mt-6 p-4 border rounded">
        <h2 className="text-lg font-semibold">Manage Instruments</h2>
        <ul>
          {instruments.map((instrument, index) => (
            <li key={index} className="p-2 border-b">{instrument}</li>
          ))}
        </ul>
        <input type="text" className="w-full p-2 border rounded mt-2" value={newInstrument} onChange={(e) => setNewInstrument(e.target.value)} />
        <button className="w-full mt-2 bg-blue-500 text-white py-2 rounded" onClick={handleAddInstrument}>Add Instrument</button>
      </div>

      {/* Patterns Section */}
      <div className="mt-6 p-4 border rounded">
        <h2 className="text-lg font-semibold">Manage Trade Patterns</h2>
        <ul>
          {patterns.map((pattern, index) => (
            <li key={index} className="p-2 border-b">{pattern}</li>
          ))}
        </ul>
        <input type="text" className="w-full p-2 border rounded mt-2" value={newPattern} onChange={(e) => setNewPattern(e.target.value)} />
        <button className="w-full mt-2 bg-blue-500 text-white py-2 rounded" onClick={handleAddPattern}>Add Pattern</button>
      </div>

      {/* Break-even Range */}
      <div className="mt-6 p-4 border rounded">
        <h2 className="text-lg font-semibold">Break-Even Range</h2>
        <label>Min:</label>
        <input type="number" className="w-full p-2 border rounded" value={beRange.min} onChange={(e) => setBeRange({ ...beRange, min: Number(e.target.value) })} />
        <label>Max:</label>
        <input type="number" className="w-full p-2 border rounded mt-2" value={beRange.max} onChange={(e) => setBeRange({ ...beRange, max: Number(e.target.value) })} />
        <button className="w-full mt-4 bg-green-500 text-white py-2 rounded" onClick={handleUpdateSettings}>Save Settings</button>
      </div>
    </div>
  );
}
