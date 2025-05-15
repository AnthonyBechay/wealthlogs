import { useState } from "react";
import { useRouter } from "next/router";
import { api } from "@wealthlog/common";

export default function Register() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [roleName, setRoleName] = useState("MEMBER");
  const [error, setError] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await api.post("/auth/register", {
        username,
        email,
        password,
        firstName,
        lastName,
        phone,
        dateOfBirth,
        securityQuestion,
        securityAnswer,
        roleName,
      });
      // After successful registration, redirect to login
      router.push("/login");
    } catch (err) {
      console.error("Registration error:", err);
      setError(
        "Registration failed. Please try again or use a different username/email."
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background-2)] bg-[var(--background)] text-[var(--text)]">
      <div className="w-full max-w-lg bg-[var(--background-2)] rounded-lg shadow p-6">
        <h2 className="text-3xl font-extrabold text-center text-[var(--text)]">
          Create an Account
        </h2>
        <p className="text-center text-[var(--text)] mt-1">
          Get started with your WealthLog!
        </p>

        {error && (
          <div className="text-red-600 bg-red-50 p-2 rounded mt-4 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="mt-6 space-y-4">
          {/* Username + Email */}
          <div>
            <label className="block font-semibold text-[var(--text)]">Username</label>
            <input
              type="text"
              className="mt-1 p-2 w-full border rounded focus:outline-none focus:ring focus:ring-blue-300"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block font-semibold text-[var(--text)]">Email</label>
            <input
              type="email"
              className="mt-1 p-2 w-full border rounded focus:outline-none focus:ring focus:ring-blue-300"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block font-semibold text-[var(--text)]">Password</label>
            <input
              type="password"
              className="mt-1 p-2 w-full border rounded focus:outline-none focus:ring focus:ring-blue-300"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* First & Last Name */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block font-semibold text-[var(--text)]">First Name</label>
              <input
                type="text"
                className="mt-1 p-2 w-full border rounded focus:outline-none focus:ring focus:ring-blue-300"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="flex-1">
              <label className="block font-semibold text-[var(--text)]">Last Name</label>
              <input
                type="text"
                className="mt-1 p-2 w-full border rounded focus:outline-none focus:ring focus:ring-blue-300"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Phone + DOB (optional) */}
          <div>
            <label className="block font-semibold text-[var(--text)]">Phone (Optional)</label>
            <input
              type="tel"
              className="mt-1 p-2 w-full border rounded focus:outline-none focus:ring focus:ring-blue-300"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <label className="block font-semibold text-[var(--text)]">Date of Birth (Optional)</label>
            <input
              type="date"
              className="mt-1 p-2 w-full border rounded focus:outline-none focus:ring focus:ring-blue-300"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
          </div>

          {/* Security Q/A (optional) */}
          <div>
            <label className="block font-semibold text-[var(--text)]">Security Question (Optional)</label>
            <input
              type="text"
              className="mt-1 p-2 w-full border rounded focus:outline-none focus:ring focus:ring-blue-300"
              value={securityQuestion}
              onChange={(e) => setSecurityQuestion(e.target.value)}
            />
          </div>
          <div>
            <label className="block font-semibold text-[var(--text)]">Security Answer (Optional)</label>
            <input
              type="text"
              className="mt-1 p-2 w-full border rounded focus:outline-none focus:ring focus:ring-blue-300"
              value={securityAnswer}
              onChange={(e) => setSecurityAnswer(e.target.value)}
            />
          </div>

       

          <button
            type="submit"
            className="w-full mt-4 py-2 bg-green-600 text-white font-bold rounded hover:bg-green-700 transition"
          >
            Register
          </button>
        </form>

        <p className="mt-4 text-center text-[var(--text)]">
          Already have an account?{" "}
          <a href="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
            Login
          </a>
        </p>
      </div>
    </div>
  );
}