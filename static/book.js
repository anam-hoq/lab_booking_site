// Custom users with new usernames/passwords
const allowedUsers = [
  { user: 'anam', pass: '12233344' },
  { user: 'msok', pass: '12233344' },
  { user: 'ssarker', pass: '12233344' }
];

// Custom equipment list
const equipmentList = [ "Upnano", "Elegoo Mars 4", "ASIGA" ];

// Login logic (index.html)
function loginUser() {
  let u = document.getElementById('username').value.trim();
  let p = document.getElementById('password').value.trim();
  let found = allowedUsers.some(entry => entry.user === u && entry.pass === p);
  if (found) {
    localStorage.setItem('currentUser', u);
    window.location.href = "/dashboard.html";
    return false;
  } else {
    alert('Invalid login!');
    return false;
  }
}

// Logout (dashboard.html)
function logout() {
  localStorage.removeItem('currentUser');
  window.location.href = "/";
}

// Booking API helpers
async function getEquipmentBookings(equipment) {
  const resp = await fetch('/api/bookings/' + encodeURIComponent(equipment));
  return await resp.json();
}
async function saveEquipmentBooking(equipment, newEvent) {
  await fetch('/api/bookings/' + encodeURIComponent(equipment), {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(newEvent)
  });
}
async function deleteEquipmentBooking(equipment, event) {
  await fetch('/api/bookings/' + encodeURIComponent(equipment), {
    method: 'DELETE',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(event)
  });
}

// Dashboard Logic
if (window.location.pathname.endsWith('dashboard.html')) {
  // Check login
  let user = localStorage.getItem('currentUser');
  if (!user) window.location.href = "/";
  // Fill Selector
  let select = document.getElementById('equipment-select');
  let nameTitle = document.getElementById('equipment-name');
  equipmentList.forEach(eq => {
    let opt = document.createElement('option');
    opt.value = eq;
    opt.textContent = eq;
    select.appendChild(opt);
  });
  nameTitle.textContent = select.value;

  select.addEventListener('change', function() {
    nameTitle.textContent = select.value;
    // When equipment changes, also auto-scroll calendar to top
    window.scrollTo({top: 0, behavior: 'smooth'});
  });

  document.addEventListener('DOMContentLoaded', reloadCalendar);
}

let currentCalendar = null;

async function reloadCalendar() {
  let calendarEl = document.getElementById('calendar');
  let select = document.getElementById('equipment-select');
  let nameTitle = document.getElementById('equipment-name');
  let selectedEquipment = select.value || equipmentList[0];
  nameTitle.textContent = selectedEquipment;

  // Remove rendered calendar
  if (currentCalendar) { currentCalendar.destroy(); }
  calendarEl.innerHTML = '';

  let events = await getEquipmentBookings(selectedEquipment);

  // Use FullCalendar's "timeGridDay" on small screens for best mobile tap-ability
  let isMobile = window.innerWidth < 700;

  currentCalendar = new FullCalendar.Calendar(calendarEl, {
    initialView: isMobile ? "timeGridDay" : "timeGridWeek",
    businessHours: false,
    slotMinTime: '00:00:00',
    slotMaxTime: '24:00:00',
    slotDuration: isMobile ? "02:00:00" : "01:00:00",
    selectable: true,
    height: isMobile ? "auto" : 900,
    contentHeight: isMobile ? 'auto' : undefined,
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: isMobile ? "timeGridDay" : 'timeGridWeek,timeGridDay'
    },
    events: events,
    select: async function(info) {
      let currentUser = localStorage.getItem('currentUser');
      if (!currentUser) { alert("Log in required."); return; }
      let title = prompt("Enter reservation note (optional):", "");
      if (title === null) {
        currentCalendar.unselect();
        return;
      }
      // Save event via API
      let newEvent = {
        title: (title ? currentUser + ': ' + title : currentUser),
        start: info.startStr,
        end: info.endStr,
        allDay: false
      };
      // Check for overlap with existing bookings
      if (events.some(ev =>
        (Date.parse(info.start) < Date.parse(ev.end)) && (Date.parse(info.end) > Date.parse(ev.start))
      )) {
        alert("This time slot is already reserved!");
        currentCalendar.unselect();
        return;
      }
      await saveEquipmentBooking(selectedEquipment, newEvent);
      events.push(newEvent);
      currentCalendar.addEvent(newEvent);
    },
    eventClick: async function(info) {
      let currentUser = localStorage.getItem('currentUser');
      if (info.event.title.startsWith(currentUser)) {
        if (confirm("Delete your reservation?")) {
          let eventData = {
            title: info.event.title,
            start: info.event.startStr,
            end: info.event.endStr
          };
          await deleteEquipmentBooking(selectedEquipment, eventData);
          info.event.remove();
        }
      }
    }
  });

  currentCalendar.render();
}
