import { useState } from "react";
import { useRouter } from "next/router";
import { api } from "../utils/api"; // your axios/fetch wrapper

export default function Register() {
  const router = useRouter();

  // Basic fields
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Optional
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");

  // Role to assign at creation
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
        roleName, // e.g. "MEMBER" or "ADMIN"
      });
      router.push("/login");
    } catch (err) {
      console.error("Registration error:", err);
      setError("Registration failed. Try again or choose a different username/email.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-6 bg-white rounded shadow-md">
        <h2 className="text-2xl font-bold text-center">Register</h2>
        {error && <p className="text-red-500 text-center mt-2">{error}</p>}

        <form onSubmit={handleRegister} className="mt-4 space-y-4">
          {/* Username */}
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
          {/* Email */}
          <div>
            <label className="block">Email</label>
            <input
              type="email"
              className="w-full px-3 py-2 border rounded"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {/* Password */}
          <div>
            <label className="block">Password</label>
            <input
              type="password"
              className="w-full px-3 py-2 border rounded"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {/* First & Last */}
          <div>
            <label className="block">First Name</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block">Last Name</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
          {/* Optional fields */}
          <div>
            <label className="block">Phone (optional)</label>
            <input
              type="tel"
              className="w-full px-3 py-2 border rounded"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <label className="block">Date of Birth (optional)</label>
            <input
              type="date"
              className="w-full px-3 py-2 border rounded"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
          </div>
          <div>
            <label className="block">Security Question (optional)</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded"
              value={securityQuestion}
              onChange={(e) => setSecurityQuestion(e.target.value)}
            />
          </div>
          <div>
            <label className="block">Security Answer (optional)</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded"
              value={securityAnswer}
              onChange={(e) => setSecurityAnswer(e.target.value)}
            />
          </div>
          {/* Role selection */}
          <div>
            <label className="block">Role (Assign on creation)</label>
            <select
              className="w-full px-3 py-2 border rounded"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
            >
              <option value="MEMBER">MEMBER</option>
              <option value="ADMIN">ADMIN</option>
              <option value="MANAGER">MANAGER</option>
              {/* etc. add more if you want */}
            </select>
          </div>

          <button
            type="submit"
            className="w-full bg-green-600 text-white py-2 rounded mt-2"
          >
            Register
          </button>
        </form>

        <p className="mt-3 text-center">
          Already have an account?{" "}
          <a href="/login" className="text-blue-500">
            Login
          </a>
        </p>
      </div>
    </div>
  );
}
