// Platts closes at 15:30, after the regular 15:00 price announcement.
// The announcement date opens the NEXT session window (start inclusive).
// An extraordinary confirmed price event also opens a new window on its date.
export const marketCalendar={
  sessionCloseTime:'15:30',
  announcementTime:'15:00',
  startDateOverrides:{}
};
