import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Clock3, MessageCircle, Phone, Star, UserRound } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Loader from '../components/ui/Loader.jsx';
import Modal from '../components/ui/Modal.jsx';
import { getMentors } from '../services/mentorService.js';
import { resolveAssetUrl } from '../utils/assets.js';

function getInitials(name = '') {
  return name
    .split(' ')
    .slice(0, 2)
    .map((item) => item.charAt(0))
    .join('')
    .toUpperCase() || 'MP';
}

function getMentorSlots(mentor) {
  return Array.isArray(mentor?.slots) ? mentor.slots.filter(Boolean) : [];
}

function getWeekDays() {
  return Array.from({ length: 6 }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return {
      label: date.toLocaleDateString(undefined, { weekday: 'short' }),
      day: date.getDate(),
      iso: date.toISOString().slice(0, 10),
      current: index === 0
    };
  });
}

export default function SupportSessionsPage() {
  const location = useLocation();
  const view = location.pathname.includes('/mentors') ? 'mentors' : 'schedules';
  const [loading, setLoading] = useState(true);
  const [mentors, setMentors] = useState([]);
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [bookings, setBookings] = useState(() => JSON.parse(localStorage.getItem('monoprep-bookings') || '[]'));

  const days = useMemo(getWeekDays, []);
  const timeSlots = useMemo(() => [...new Set(mentors.flatMap((mentor) => getMentorSlots(mentor)))].sort(), [mentors]);

  useEffect(() => {
    getMentors()
      .then((rows) => setMentors(rows))
      .catch(() => setMentors([]))
      .finally(() => setLoading(false));
  }, []);

  function bookSession() {
    if (!selectedMentor || !selectedSlot) return;
    const booking = {
      mentor: selectedMentor.name,
      subject: selectedMentor.subject,
      slot: selectedSlot,
      id: `${selectedMentor.name}-${selectedSlot}-${Date.now()}`
    };
    const next = [booking, ...bookings];
    setBookings(next);
    localStorage.setItem('monoprep-bookings', JSON.stringify(next));
    setSelectedMentor(null);
    setSelectedSlot('');
  }

  if (loading) {
    return (
      <AppLayout title="Support Sessions" subtitle="Book mentor support and follow your weekly prep schedule.">
        <Loader label="Loading support sessions..." />
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Support Sessions" subtitle="Book mentor support and follow your weekly prep schedule.">
      {view === 'schedules' ? (
        <div className="support-session-grid">
          <Card title="Schedules" className="schedule-card">
            {mentors.length && timeSlots.length ? (
              <>
                <div className="schedule-days support-week-strip">
                  {days.map((day) => (
                <div key={day.iso} className={day.current ? 'current' : ''}>
                  <span>{day.label}</span>
                  <strong>{day.day}</strong>
                </div>
                  ))}
                </div>
                <div className="schedule-timeline support-timeline">
                  {timeSlots.map((time) => {
                const available = mentors.find((mentor) => getMentorSlots(mentor).includes(time));
                return (
                  <div key={time}>
                    <span>{time}</span>
                    <button
                      type="button"
                      className={available ? 'available' : ''}
                      disabled={!available}
                      onClick={() => {
                        if (!available) return;
                        setSelectedSlot(time);
                        setSelectedMentor(available);
                      }}
                    >
                      {available ? `${available.subject} with ${available.name}` : ''}
                    </button>
                  </div>
                );
                  })}
                </div>
              </>
            ) : (
              <EmptyState icon={CalendarClock} title="No schedule slots yet" message="Admin-added mentor availability will appear here." />
            )}
          </Card>

          <Card title="My bookings" className="booking-panel">
            {bookings.length ? (
              <div className="booking-list">
                {bookings.map((booking) => (
                  <article key={booking.id}>
                    <strong>{booking.mentor}</strong>
                    <span>{booking.subject}</span>
                    <b><Clock3 aria-hidden="true" /> {booking.slot}</b>
                  </article>
                ))}
              </div>
            ) : (
              <p className="helper-copy">No mentor sessions booked yet.</p>
            )}
          </Card>
        </div>
      ) : null}

      {view === 'mentors' ? (
        mentors.length ? (
          <div className="mentor-grid mentor-directory">
            {mentors.map((mentor) => (
            <article key={mentor.id || mentor.name} className="mentor-card">
              <div className="mentor-avatar">
                {mentor.imageUrl ? <img src={resolveAssetUrl(mentor.imageUrl)} alt="" /> : getInitials(mentor.name)}
              </div>
              <div>
                <span><Star aria-hidden="true" /> {mentor.rating || 5}</span>
                <h3>{mentor.name}</h3>
                <p>{mentor.subject}</p>
                {mentor.bio ? <small>{mentor.bio}</small> : null}
                <div className="mentor-contact-row">
                  {mentor.telegram ? <a href={`https://t.me/${mentor.telegram.replace('@', '')}`} target="_blank" rel="noreferrer"><MessageCircle aria-hidden="true" /> {mentor.telegram}</a> : null}
                  {mentor.phone ? <a href={`tel:${mentor.phone}`}><Phone aria-hidden="true" /> {mentor.phone}</a> : null}
                </div>
                <button type="button" onClick={() => setSelectedMentor(mentor)} disabled={!getMentorSlots(mentor).length}>
                  <CalendarClock aria-hidden="true" /> Book session
                </button>
              </div>
            </article>
            ))}
          </div>
        ) : (
          <EmptyState icon={UserRound} title="No mentors yet" message="Admin-added mentor cards will appear here." />
        )
      ) : null}

      <Modal
        open={Boolean(selectedMentor)}
        title={selectedMentor ? `Book ${selectedMentor.name}` : 'Book mentor'}
        onClose={() => setSelectedMentor(null)}
        actions={(
          <>
            <Button variant="ghost" onClick={() => setSelectedMentor(null)}>Cancel</Button>
            <Button onClick={bookSession} disabled={!selectedSlot}>Confirm booking</Button>
          </>
        )}
      >
        <div className="booking-modal">
          <span className="settings-card-icon blue"><UserRound aria-hidden="true" /></span>
          <p>{selectedMentor?.subject}</p>
          <div className="slot-grid">
            {getMentorSlots(selectedMentor).map((slot) => (
              <button
                key={slot}
                type="button"
                className={selectedSlot === slot ? 'active' : ''}
                onClick={() => setSelectedSlot(slot)}
              >
                {slot}
              </button>
            ))}
          </div>
          {!getMentorSlots(selectedMentor).length ? <p className="helper-copy">This mentor has no available slots right now.</p> : null}
        </div>
      </Modal>
    </AppLayout>
  );
}
