// Allowed users
const allowedUsers = [
  { user: 'user1', pass: '1234' },
  { user: 'user2', pass: '1234' },
  { user: 'user3', pass: '1234' }
];

// List your equipment here
const equipmentList = [ "Microscope", "3D Printer", "Oscilloscope" ];

// Login logic (used by index.html)
function loginUser() {
  let u = document.getElementById('username').value.trim();
  let p = document.getElementById('password').value.trim();
  let found = allowedUsers.some(entry => entry.user === u && entry.pass === p);
  if (found) {
    localStorage.setItem('currentUser', u);
    window.location.href = "dashboard.html";
    return false;
  } else {
    alert('Invalid login!');
    return false;
  }
}

// Logout logic (used by dashboard.html)
function logout() {
  localStorage.removeItem('currentUser');
  window.location.href = "index.html";
}

// Calendar and reservation logic (used by dashboard.html)
if (window.location.pathname.endsWith('dashboard.html')) {
  // Check login
  let user = localStorage.getItem('currentUser');
  if (!user) window.location.href = "index.html";

  // Populate equipment selector
  let select = document.getElementById('equipment-select');
  equipmentList.forEach(eq => {
    let opt = document.createElement('option');
    opt.value = eq;
    opt.textContent = eq;
    select.appendChild(opt);
  });

  // Initialize calendar after page load and equipment selected
  document.addEventListener('DOMContentLoaded', function() {
    reloadCalendar(); // renders for default equipment
  });
}

// Helper: Get all bookings for selected equipment from localStorage
function getEquipmentBookings(equipment) {
  return JSON.parse(localStorage.getItem('bookings_' + equipment) || '[]');
}

// Helper: Save bookings for selected equipment
function saveEquipmentBookings(equipment, bookings) {
  localStorage.setItem('bookings_' + equipment, JSON.stringify(bookings));
}

// Called on page load and when equipment changed
function reloadCalendar() {
  let calendarEl = document.getElementById('calendar');
  let selectedEquipment = document.getElementById('equipment-select').value || equipmentList[0];

  // Remove any previously rendered calendar
  if (calendarEl.innerHTML) calendarEl.innerHTML = "";

  let calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'timeGridWeek',
    businessHours: true,
    slotMinTime: '00:00:00',
    slotMaxTime: '24:00:00',
    selectable: true,
    height: 600,
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'timeGridWeek,timeGridDay'
    },
    events: getEquipmentBookings(selectedEquipment),

    select: function(info) {
      let currentUser = localStorage.getItem('currentUser');
      if (!currentUser) { alert("Log in required."); return; }
      let title = prompt("Enter reservation note (optional):", "");
      if (title === null) {
        calendar.unselect();
        return;
      }
      // Save booking as an event
      let newEvent = {
        title: (title ? currentUser + ': ' + title : currentUser),
        start: info.startStr,
        end: info.endStr,
        allDay: false
      };
      // Check for overlap with existing bookings
      let bookings = getEquipmentBookings(selectedEquipment);
      if (bookings.some(ev =>
        (Date.parse(info.start) < Date.parse(ev.end)) && (Date.parse(info.end) > Date.parse(ev.start))
      )) {
        alert("This time slot is already reserved!");
        calendar.unselect();
        return;
      }
      bookings.push(newEvent);
      saveEquipmentBookings(selectedEquipment, bookings);
      calendar.addEvent(newEvent);
    },

    eventClick: function(info) {
      let currentUser = localStorage.getItem('currentUser');
      // Only allow delete by the reserver
      if (info.event.title.startsWith(currentUser)) {
        if (confirm("Delete your reservation?")) {
          let bookings = getEquipmentBookings(selectedEquipment);
          let idx = bookings.findIndex(ev =>
            ev.title === info.event.title &&
            ev.start === info.event.startStr &&
            ev.end === info.event.endStr
          );
          if (idx !== -1) {
            bookings.splice(idx, 1);
            saveEquipmentBookings(selectedEquipment, bookings);
          }
          info.event.remove();
        }
      }
    }
  });

  calendar.render();
}
