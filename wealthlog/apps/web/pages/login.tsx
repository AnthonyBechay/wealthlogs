// pages/login.tsx

import { useState } from "react";
import { useRouter } from "next/router";
import { api, setAccessToken } from "@wealthlog/common";

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const response = await api.post("/auth/login", { username, password });
      setAccessToken(response.data.token);
      router.push("/landing");
    } catch (err) {
      setError("Invalid username or password.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-6">
        <h2 className="text-3xl font-extrabold text-center text-gray-800">
          Welcome Back
        </h2>
        <p className="text-center text-gray-500 mt-1">
          Please log in to continue.
        </p>

        {error && (
          <div className="text-red-600 bg-red-50 p-2 rounded mt-4 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          {/* Username */}
          <div>
            <label className="block font-semibold text-gray-700">Username</label>
            <input
              type="text"
              className="w-full mt-1 p-2 border rounded focus:outline-none focus:ring focus:ring-blue-300"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block font-semibold text-gray-700">Password</label>
            <input
              type="password"
              className="w-full mt-1 p-2 border rounded focus:outline-none focus:ring focus:ring-blue-300"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* Login Button */}
          <button
            type="submit"
            className="w-full py-2 mt-3 text-white font-bold rounded bg-blue-600 hover:bg-blue-700 transition"
          >
            Login
          </button>
        </form>

        <p className="mt-4 text-center text-gray-600">
          Don&apos;t have an account?{" "}
          <a href="/register" className="text-blue-600 hover:text-blue-700 font-semibold">
            Register
          </a>
        </p>
      </div>
    </div>
  );
}
