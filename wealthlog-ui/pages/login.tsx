import { useState } from "react";
import { useRouter } from "next/router";
import { api } from "../utils/api";

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const response = await api.post("/login", { username, password });
      localStorage.setItem("token", response.data.token);
      router.push("/tradeManagement");
    } catch (err) {
      setError("Invalid username or password.");
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="w-full max-w-md p-6 bg-white rounded shadow-md">
        <h2 className="text-2xl font-bold text-center">Login</h2>
        {error && <p className="text-red-500 text-center">{error}</p>}
        <form onSubmit={handleLogin} className="mt-4">
          <div>
            <label className="block">Username</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="mt-3">
            <label className="block">Password</label>
            <input
              type="password"
              className="w-full px-3 py-2 border rounded"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="w-full mt-4 bg-blue-500 text-white py-2 rounded">
            Login
          </button>
        </form>
        <p className="mt-3 text-center">
          No account? <a href="/register" className="text-blue-500">Register</a>
        </p>
      </div>
    </div>
  );
}
