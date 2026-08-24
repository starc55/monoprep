import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Search,
  Trophy,
  UserPlus,
  UsersRound,
} from "lucide-react";
import AppLayout from "../layouts/AppLayout.jsx";
import Loader from "../components/ui/Loader.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import PremiumSelect from "../components/ui/PremiumSelect.jsx";
import {
  followStudent,
  getStudents,
  unfollowStudent,
} from "../services/socialService.js";
import { resolveAssetUrl } from "../utils/assets.js";
import { useAuthStore } from "../store/authStore.js";
import { getLeagueFromScore, getLevelFromScore } from "../utils/league.js";

const studentSortOptions = [
  { value: "rank", label: "Rank" },
  { value: "score", label: "Best score" },
  { value: "activity", label: "Activity" },
  { value: "followers", label: "Followers" },
];

const PAGE_SIZE = 8;

function initials(name = "") {
  return (
    name
      .split(" ")
      .slice(0, 2)
      .map((item) => item[0])
      .join("")
      .toUpperCase() || "MP"
  );
}

export default function StudentsPage() {
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("rank");
  const [page, setPage] = useState(1);
  const [pendingId, setPendingId] = useState("");

  async function load() {
    const rows = await getStudents({ search, sort });
    setStudents(rows);
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, 180);
    return () => window.clearTimeout(timeout);
  }, [search, sort]);

  useEffect(() => {
    setPage(1);
  }, [search, sort]);

  async function toggleFollow(student) {
    setPendingId(student.id);
    try {
      if (student.isFollowing) await unfollowStudent(student.id);
      else await followStudent(student.id);
      await load();
    } finally {
      setPendingId("");
    }
  }

  const totalPages = Math.max(1, Math.ceil(students.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visibleStudents = students.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );
  const resultStart = students.length ? (safePage - 1) * PAGE_SIZE + 1 : 0;
  const resultEnd = Math.min(safePage * PAGE_SIZE, students.length);

  return (
    <AppLayout
      title="Students"
      subtitle="Discover classmates, follow progress, and learn from public SAT profiles."
    >
      <div className="community-toolbar">
        <label className="community-search">
          <Search aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, username, or email"
          />
        </label>
        <PremiumSelect
          ariaLabel="Sort students"
          value={sort}
          onChange={setSort}
          options={studentSortOptions}
          className="community-select"
        />
      </div>

      {loading ? <Loader label="Loading students..." /> : null}
      {!loading && !students.length ? (
        <EmptyState
          icon={UsersRound}
          title="No students found"
          message="Students with public educational stats will appear here."
        />
      ) : null}
      {!loading && students.length ? (
        <section className="students-table-shell">
          <div className="students-table-head">
            <div>
              <span>Community Students</span>
              <strong>{students.length} learners</strong>
            </div>
            <p>
              Showing {resultStart}-{resultEnd} of {students.length}
            </p>
          </div>
          <div className="students-table-scroll">
            <table className="students-premium-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Rank</th>
                  <th>League</th>
                  <th>Best</th>
                  <th>Tests</th>
                  <th>Accuracy</th>
                  <th>Social</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {visibleStudents.map((student, index) => {
                  const league = getLeagueFromScore(student.bestScore);
                  const level = getLevelFromScore(
                    student.bestScore,
                    student.completedExams,
                    student.accuracy
                  );
                  return (
                    <motion.tr
                      key={student.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.025 }}
                    >
                      <td>
                        <div className="students-table-profile">
                          <span className="student-avatar table-avatar">
                            {student.avatarUrl ? (
                              <img
                                src={resolveAssetUrl(student.avatarUrl)}
                                alt=""
                              />
                            ) : (
                              initials(student.fullName)
                            )}
                          </span>
                          <div>
                            <strong>{student.fullName}</strong>
                            <span>
                              {student.username
                                ? `@${student.username}`
                                : student.emailPreview}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="student-rank compact">
                          <Trophy aria-hidden="true" />
                          {student.rank ? `#${student.rank}` : "--"}
                        </span>
                      </td>
                      <td>
                        <span className={`league-badge league-${league.key}`}>
                          Level {level} - {league.name}
                        </span>
                      </td>
                      <td><b>{student.bestScore || "--"}</b></td>
                      <td>{student.completedExams}</td>
                      <td>{student.accuracy}%</td>
                      <td>
                        <span className="students-social-counts">
                          {student.followersCount} / {student.followingCount}
                        </span>
                      </td>
                      <td>
                        <div className="students-table-actions">
                          <button
                            type="button"
                            disabled={
                              pendingId === student.id || student.id === user?.id
                            }
                            onClick={() => toggleFollow(student)}
                          >
                            <UserPlus aria-hidden="true" />
                            {student.id === user?.id
                              ? "You"
                              : student.isFollowing
                              ? "Following"
                              : "Follow"}
                          </button>
                          <Link to={`/students/${student.id}`}>
                            <Eye aria-hidden="true" /> Profile
                          </Link>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="students-pagination">
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={safePage === 1}
            >
              <ChevronLeft aria-hidden="true" /> Previous
            </button>
            <span>
              Page {safePage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() =>
                setPage((value) => Math.min(totalPages, value + 1))
              }
              disabled={safePage === totalPages}
            >
              Next <ChevronRight aria-hidden="true" />
            </button>
          </div>
        </section>
      ) : null}
    </AppLayout>
  );
}
