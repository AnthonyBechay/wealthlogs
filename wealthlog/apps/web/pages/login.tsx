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
      // POST credentials; expect { token, user } in the response
      const response = await api.post("/auth/login", { username, password });
      // Store the token in localStorage or in memory
      setAccessToken(response.data.token);

      // Then redirect
      router.push("/landing");
    } catch (err) {
      setError("Invalid username or password.");
    }
  };

  return (
    <div
      className="flex items-center justify-center min-h-screen"
      style={{ backgroundColor: "#FAFAFA" }}
    >
      <div
        className="w-full max-w-md p-6 rounded shadow-md"
        style={{
          backgroundColor: "#FFF",
          borderColor: "#37474F",
          borderWidth: "1px",
        }}
      >
        <h2
          className="text-2xl font-bold text-center"
          style={{ color: "#37474F" }}
        >
          Login
        </h2>

        {error && (
          <p className="text-center mt-2" style={{ color: "#d32f2f" }}>
            {error}
          </p>
        )}

        <form onSubmit={handleLogin} className="mt-4">
          <div className="mt-2">
            <label className="block font-semibold" style={{ color: "#37474F" }}>
              Username
            </label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              style={{ borderColor: "#37474F" }}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="mt-3">
            <label className="block font-semibold" style={{ color: "#37474F" }}>
              Password
            </label>
            <input
              type="password"
              className="w-full p-2 border rounded"
              style={{ borderColor: "#37474F" }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full mt-4 py-2 rounded font-semibold"
            style={{ backgroundColor: "#00C853", color: "#FFF" }}
          >
            Login
          </button>
        </form>

        <p className="mt-3 text-center" style={{ color: "#37474F" }}>
          No account?{" "}
          <a href="/register" style={{ color: "#00796B" }}>
            Register
          </a>
        </p>
      </div>
    </div>
  );
}
