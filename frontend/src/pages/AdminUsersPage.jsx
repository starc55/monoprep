import { useEffect, useState } from 'react';
import AdminLayout from '../layouts/AdminLayout.jsx';
import AdminUsersTable from '../components/admin/AdminUsersTable.jsx';
import Card from '../components/ui/Card.jsx';
import Loader from '../components/ui/Loader.jsx';
import { getUsers } from '../services/adminService.js';

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    getUsers()
      .then(setUsers)
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
        <AdminUsersTable users={users} />
      </Card>
    </AdminLayout>
  );
}
