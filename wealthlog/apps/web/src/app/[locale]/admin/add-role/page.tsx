"use client";

import { useEffect, useState } from "react";
import { api } from "@wealthlog/common";

interface Role {
  id: number;
  name: string;
  description?: string | null;
}

export default function AdminAddRole() {
  const [userId, setUserId] = useState("");
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleName, setSelectedRoleName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // On mount, fetch the list of roles
  useEffect(() => {
    fetchAllRoles();
  }, []);

  const fetchAllRoles = async () => {
    try {
      const res = await api.get("/admin/roles");
      setRoles(res.data || []);
      // If there's at least one role, pick the first by default
      if (res.data?.length > 0) {
        setSelectedRoleName(res.data[0].name);
      }
    } catch (err) {
      console.error("Failed to fetch roles:", err);
      setError("Failed to fetch roles from server.");
    }
  };

  const handleAddRole = async () => {
    setMessage("");
    setError("");

    try {
      const numericUserId = parseInt(userId);
      if (isNaN(numericUserId) || numericUserId <= 0) {
        setError("Invalid userId. Must be a positive number.");
        return;
      }
      if (!selectedRoleName) {
        setError("No role selected.");
        return;
      }

      // POST /admin/users/:userId/addRole
      const res = await api.post(`/admin/users/${numericUserId}/addRole`, {
        roleName: selectedRoleName
      });
      setMessage(`Success! ${res.data.message}. User Roles: ${res.data.userRoles.join(", ")}`);
    } catch (err) {
      console.error("Add role error:", err);
      setError("Failed to add role to user. Check console for details.");
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Admin: Add Role to User</h1>
      {error && <p className="text-red-500">{error}</p>}
      {message && <p className="text-green-500">{message}</p>}

      <div className="mt-4">
        <label>User ID:</label>
        <input
          type="number"
          className="border p-2 ml-2"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          style={{ width: "100px" }}
        />
      </div>

      <div className="mt-4">
        <label>Role Name:</label>
        <select
          className="border p-2 ml-2"
          value={selectedRoleName}
          onChange={(e) => setSelectedRoleName(e.target.value)}
        >
          {roles.map((role) => (
            <option key={role.id} value={role.name}>
              {role.name}
            </option>
          ))}
        </select>
      </div>

      <button
        className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
        onClick={handleAddRole}
      >
        Add Role
      </button>
    </div>
  );
}
