import { useEffect, useState } from "react";
import { userApi } from "../services/userService";
import AppIcon from "../components/ui/AppIcon";

export default function TeamPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    userApi
      .productivity()
      .then(setUsers)
      .catch(async (err) => {
        if (err?.response?.status === 403) {
          const fallback = await userApi.list();
          setUsers(fallback.map((u) => ({ ...u, resolved: "-", openAssigned: "-" })));
          return;
        }
        setError(err?.response?.data?.message || "Could not load team data.");
      })
      .finally(() => setLoading(false));
  }, []);

  const adminCount = users.filter((user) => user.role === "Admin").length;
  const devCount = users.filter((user) => user.role === "Developer").length;
  const testerCount = users.filter((user) => user.role === "Tester").length;

  return (
    <div className="page-stack">
      <section className="card">
        <h2 className="section-title"><AppIcon name="team" /> Team Overview</h2>
        <p className="muted">Members, roles, and productivity indicators.</p>
      </section>

      {!loading && !error && (
        <section className="kpi-row stagger-list">
          <article className="kpi-card">
            <p className="muted">Admins</p>
            <strong>{adminCount}</strong>
          </article>
          <article className="kpi-card">
            <p className="muted">Developers</p>
            <strong>{devCount}</strong>
          </article>
          <article className="kpi-card">
            <p className="muted">Testers</p>
            <strong>{testerCount}</strong>
          </article>
        </section>
      )}

      <section className="card">
        {loading && <p className="muted">Loading team data...</p>}
        {error && <p className="error">{error}</p>}
        {!loading && !error && (
          <div className="smart-table-wrap">
            <table className="table smart-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Email</th>
                  <th>Resolved</th>
                  <th>Open Assigned</th>
                </tr>
              </thead>
              <tbody className="stagger-list">
                {users.map((user) => (
                  <tr key={user.id || user._id}>
                    <td>{user.name}</td>
                    <td>{user.role}</td>
                    <td>{user.email}</td>
                    <td>{user.resolved}</td>
                    <td>{user.openAssigned}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
