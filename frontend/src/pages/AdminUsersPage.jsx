import { useEffect, useState } from 'react';
import { UsersRound } from 'lucide-react';
import AdminLayout from '../layouts/AdminLayout.jsx';
import AdminUsersTable from '../components/admin/AdminUsersTable.jsx';
import Card from '../components/ui/Card.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Loader from '../components/ui/Loader.jsx';
import { getUsers } from '../services/adminService.js';

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    getUsers()
      .then(setUsers)
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AdminLayout title="Users" subtitle="View registered students and administrators.">
        <Loader label="Loading users..." />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Users" subtitle="View registered students and administrators.">
      <Card title="Users">
        {users.length ? (
          <AdminUsersTable users={users} />
        ) : (
          <EmptyState
            icon={UsersRound}
            title="No users found"
            message="Registered students and administrators will appear in this directory."
          />
        )}
      </Card>
    </AdminLayout>
  );
}
