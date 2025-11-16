/* ===================================
   CALENDAR MODULE
   =================================== */

let currentDate = new Date();
let reminders = [];
let players = {};  // Store player data for quick lookup

document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    if (typeof window.initSidebar === 'function') {
        window.initSidebar('calendar');
    }
    await loadPlayers();
    await loadReminders();
    renderCalendar();
    renderUpcomingReminders();
    attachEventListeners();
});

async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = '../index.html';
    }
}

async function loadPlayers() {
    try {
        const { data, error } = await supabase
            .from('players')
            .select('id, first_name, last_name');
        
        if (error) throw error;
        
        // Convert to lookup object
        players = {};
        (data || []).forEach(player => {
            players[player.id] = `${player.first_name} ${player.last_name}`;
        });
        
        console.log('✅ Players loaded for calendar');
    } catch (error) {
        console.error('❌ Error loading players:', error);
    }
}

async function loadReminders() {
    try {
        const { data, error } = await supabase
            .from('reminders')
            .select('*')
            .order('due_date', { ascending: true });
        
        if (error) throw error;
        
        reminders = data || [];
        console.log('✅ Reminders loaded:', reminders.length);
    } catch (error) {
        console.error('❌ Error loading reminders:', error);
    }
}

function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Update header
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('current-month').textContent = `${monthNames[month]} ${year}`;
    
    // Get first day of month (0 = Sunday, we want Monday = 0)
    const firstDay = new Date(year, month, 1);
    let startingDayOfWeek = firstDay.getDay() - 1; // Convert to Monday = 0
    if (startingDayOfWeek === -1) startingDayOfWeek = 6; // Sunday becomes 6
    
    // Get last day of month
    const lastDay = new Date(year, month + 1, 0).getDate();
    
    // Get reminders for this month
    const monthReminders = reminders.filter(r => {
        if (!r.due_date) return false;
        const rDate = new Date(r.due_date);
        return rDate.getMonth() === month && rDate.getFullYear() === year;
    });
    
    // Build calendar grid
    const grid = document.getElementById('calendar-grid');
    
    // Keep headers, remove old days
    while (grid.children.length > 7) {
        grid.removeChild(grid.lastChild);
    }
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.style.cssText = 'min-height: 100px; border-bottom: 1px solid var(--gray-100); border-right: 1px solid var(--gray-100); background: var(--gray-50);';
        grid.appendChild(emptyCell);
    }
    
    // Add days of month
    for (let day = 1; day <= lastDay; day++) {
        const dayCell = document.createElement('div');
        dayCell.style.cssText = 'min-height: 100px; border-bottom: 1px solid var(--gray-100); border-right: 1px solid var(--gray-100); padding: 8px; position: relative;';
        
        // Day number
        const dayNumber = document.createElement('div');
        dayNumber.style.cssText = 'font-weight: 600; font-size: 14px; margin-bottom: 8px; color: var(--gray-900);';
        
        // Highlight today
        const today = new Date();
        if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            dayNumber.style.cssText += 'background: var(--primary-blue); color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center;';
        }
        
        dayNumber.textContent = day;
        dayCell.appendChild(dayNumber);
        
        // Add reminders for this day
        const dayReminders = monthReminders.filter(r => {
            const rDate = new Date(r.due_date);
            return rDate.getDate() === day;
        });
        
        dayReminders.slice(0, 3).forEach(reminder => {
            const reminderEl = document.createElement('div');
            // Use green for completed (#22c55e), yellow for in-progress (#eab308)
            const bgColor = reminder.completed ? '#22c55e' : '#eab308';
            reminderEl.style.cssText = `font-size: 11px; padding: 3px 6px; margin-bottom: 2px; background: ${bgColor}; color: white; border-radius: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer;`;
            
            // Get player name if reminder has a player_id
            let displayText = '';
            if (reminder.player_id && players[reminder.player_id]) {
                // Show player name first, then beginning of title
                const playerName = players[reminder.player_id];
                const shortTitle = reminder.title.substring(0, 20);
                displayText = `${playerName} - ${shortTitle}...`;
            } else {
                // Just show the beginning of the title
                displayText = reminder.title.substring(0, 30) + (reminder.title.length > 30 ? '...' : '');
            }
            
            reminderEl.textContent = displayText;
            reminderEl.title = reminder.title + (reminder.completed ? ' ✓' : '');
            
            // Add click handler to open modal
            reminderEl.onclick = () => openReminderModal(reminder);
            
            dayCell.appendChild(reminderEl);
        });
        
        if (dayReminders.length > 3) {
            const moreEl = document.createElement('div');
            moreEl.style.cssText = 'font-size: 10px; color: var(--gray-600); font-weight: 600; margin-top: 4px; cursor: pointer;';
            moreEl.textContent = `+${dayReminders.length - 3} more`;
            moreEl.onclick = () => openDayRemindersModal(day, month, year, dayReminders);
            dayCell.appendChild(moreEl);
        }
        
        grid.appendChild(dayCell);
    }
}

function openReminderModal(reminder) {
    // Remove existing modal if present
    const existingModal = document.getElementById('reminder-detail-modal');
    if (existingModal) existingModal.remove();
    
    // Get player name
    const playerName = reminder.player_id && players[reminder.player_id] 
        ? players[reminder.player_id] 
        : 'N/A';
    
    // Create modal HTML
    const modalHTML = `
        <div id="reminder-detail-modal" class="modal" style="display: flex;">
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2>Reminder Details</h2>
                    <button class="modal-close" onclick="closeReminderModal()">&times;</button>
                </div>
                <div class="modal-body" style="padding: 24px;">
                    <div style="margin-bottom: 20px;">
                        <label style="font-weight: 600; color: var(--gray-600); font-size: 12px; text-transform: uppercase;">Title</label>
                        <p style="margin-top: 4px; font-size: 16px; color: var(--gray-900);">${reminder.title}</p>
                    </div>
                    
                    ${reminder.description ? `
                    <div style="margin-bottom: 20px;">
                        <label style="font-weight: 600; color: var(--gray-600); font-size: 12px; text-transform: uppercase;">Description</label>
                        <p style="margin-top: 4px; color: var(--gray-700);">${reminder.description}</p>
                    </div>
                    ` : ''}
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <div>
                            <label style="font-weight: 600; color: var(--gray-600); font-size: 12px; text-transform: uppercase;">Due Date</label>
                            <p style="margin-top: 4px; color: var(--gray-900);">${formatDate(reminder.due_date)}</p>
                        </div>
                        
                        <div>
                            <label style="font-weight: 600; color: var(--gray-600); font-size: 12px; text-transform: uppercase;">Status</label>
                            <p style="margin-top: 4px;">
                                <span class="status-badge ${reminder.completed ? 'signed' : 'free_agent'}">
                                    ${reminder.completed ? 'Completed' : 'Pending'}
                                </span>
                            </p>
                        </div>
                    </div>
                    
                    <div style="margin-top: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <div>
                            <label style="font-weight: 600; color: var(--gray-600); font-size: 12px; text-transform: uppercase;">Player</label>
                            <p style="margin-top: 4px; color: var(--gray-900);">${playerName}</p>
                        </div>
                        
                        <div>
                            <label style="font-weight: 600; color: var(--gray-600); font-size: 12px; text-transform: uppercase;">Tag</label>
                            <p style="margin-top: 4px; color: var(--gray-900);">${reminder.tag || 'General'}</p>
                        </div>
                    </div>
                    
                    ${!reminder.completed ? `
                    <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--gray-200);">
                        <button onclick="completeReminderFromModal('${reminder.id}')" class="btn-primary" style="width: 100%;">
                            ✓ Mark as Complete
                        </button>
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function openDayRemindersModal(day, month, year, dayReminders) {
    // Remove existing modal if present
    const existingModal = document.getElementById('day-reminders-modal');
    if (existingModal) existingModal.remove();
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    
    const remindersList = dayReminders.map(reminder => {
        const playerName = reminder.player_id && players[reminder.player_id] 
            ? players[reminder.player_id] 
            : '';
        
        return `
            <div style="padding: 12px; border-bottom: 1px solid var(--gray-100); cursor: pointer;" 
                 onclick="closeReminderModal(); openReminderModal(${JSON.stringify(reminder).replace(/"/g, '&quot;')})">
                <div style="font-weight: 600; color: var(--gray-900);">${reminder.title}</div>
                ${playerName ? `<div style="font-size: 13px; color: var(--gray-600); margin-top: 4px;">Player: ${playerName}</div>` : ''}
                <div style="font-size: 12px; color: ${reminder.completed ? '#22c55e' : '#eab308'}; margin-top: 4px;">
                    ${reminder.completed ? '✓ Completed' : '⏳ Pending'}
                </div>
            </div>
        `;
    }).join('');
    
    const modalHTML = `
        <div id="day-reminders-modal" class="modal" style="display: flex;">
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2>${monthNames[month]} ${day}, ${year}</h2>
                    <button class="modal-close" onclick="closeReminderModal()">&times;</button>
                </div>
                <div class="modal-body" style="padding: 0;">
                    ${remindersList}
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeReminderModal() {
    const modal = document.getElementById('reminder-detail-modal') || document.getElementById('day-reminders-modal');
    if (modal) modal.remove();
}

async function completeReminderFromModal(reminderId) {
    try {
        const { error } = await supabase
            .from('reminders')
            .update({ completed: true })
            .eq('id', reminderId);
        
        if (error) throw error;
        
        closeReminderModal();
        await loadReminders();
        renderCalendar();
        renderUpcomingReminders();
    } catch (error) {
        console.error('❌ Error:', error);
        alert('Error completing reminder');
    }
}

function renderUpcomingReminders() {
    const container = document.getElementById('upcoming-reminders');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const upcoming = reminders
        .filter(r => r.due_date && new Date(r.due_date) >= today && !r.completed)
        .slice(0, 10);
    
    if (upcoming.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--gray-600); padding: 20px;">No upcoming reminders</p>';
        return;
    }
    
    const html = upcoming.map(r => {
        const dueDate = new Date(r.due_date);
        const isOverdue = dueDate < today;
        const playerName = r.player_id && players[r.player_id] ? players[r.player_id] : '';
        
        return `
            <div class="detail-row" style="padding: 12px 0; border-bottom: 1px solid var(--gray-100); cursor: pointer;"
                 onclick="openReminderModal(${JSON.stringify(r).replace(/"/g, '&quot;')})">
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: var(--gray-900);">${r.title}</div>
                    ${playerName ? `<div style="font-size: 13px; color: var(--gray-600); margin-top: 4px;">Player: ${playerName}</div>` : ''}
                    ${r.description ? `<div style="font-size: 13px; color: var(--gray-600); margin-top: 4px;">${r.description.substring(0, 100)}...</div>` : ''}
                    <div style="font-size: 12px; color: ${isOverdue ? 'var(--error-red)' : '#eab308'}; margin-top: 4px; font-weight: 600;">
                        ${formatDate(r.due_date)}${isOverdue ? ' (Overdue)' : ''}
                    </div>
                </div>
                <button onclick="event.stopPropagation(); completeReminder('${r.id}')" class="btn-secondary" style="padding: 6px 12px; font-size: 13px;">✓ Complete</button>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

async function completeReminder(reminderId) {
    try {
        const { error } = await supabase
            .from('reminders')
            .update({ completed: true })
            .eq('id', reminderId);
        
        if (error) throw error;
        
        await loadReminders();
        renderCalendar();
        renderUpcomingReminders();
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

function attachEventListeners() {
    document.getElementById('btn-prev-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });
    
    document.getElementById('btn-next-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });
    
    document.getElementById('btn-today').addEventListener('click', () => {
        currentDate = new Date();
        renderCalendar();
    });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Make modal functions available globally
window.closeReminderModal = closeReminderModal;
window.completeReminderFromModal = completeReminderFromModal;
window.completeReminder = completeReminder;
window.openReminderModal = openReminderModal;