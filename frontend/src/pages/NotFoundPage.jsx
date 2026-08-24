import { Link } from "react-router-dom";
import AppLayout from "../layouts/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";

export default function NotFoundPage() {
  return (
    <AppLayout
      title="Page Not Found"
      subtitle="The page you requested does not exist."
    >
      <Card title="Navigation">
        <p>The route may be incorrect or the page may have moved.</p>
        <Link className="button button-primary" to="/dashboard">
          Back to dashboard
        </Link>
      </Card>
    </AppLayout>
  );
}
