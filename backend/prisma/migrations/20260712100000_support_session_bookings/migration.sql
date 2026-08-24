CREATE TABLE "support_session_bookings" (
    "id" TEXT NOT NULL,
    "mentor_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "session_date" TIMESTAMP(3) NOT NULL,
    "slot" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'BOOKED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_session_bookings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "support_session_bookings_mentor_id_session_date_slot_key" ON "support_session_bookings"("mentor_id", "session_date", "slot");
CREATE INDEX "support_session_bookings_student_id_session_date_idx" ON "support_session_bookings"("student_id", "session_date");
CREATE INDEX "support_session_bookings_mentor_id_session_date_idx" ON "support_session_bookings"("mentor_id", "session_date");

ALTER TABLE "support_session_bookings" ADD CONSTRAINT "support_session_bookings_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "mentors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "support_session_bookings" ADD CONSTRAINT "support_session_bookings_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
