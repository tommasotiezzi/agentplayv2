/* ===================================
   CALENDAR MODULE
   =================================== */

let currentDate = new Date();
let reminders = [];

document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    if (typeof window.initSidebar === 'function') {
        window.initSidebar('calendar');
    }
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
            reminderEl.style.cssText = 'font-size: 11px; padding: 3px 6px; margin-bottom: 2px; background: var(--accent-orange); color: white; border-radius: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer;';
            reminderEl.textContent = reminder.title;
            reminderEl.title = reminder.title;
            dayCell.appendChild(reminderEl);
        });
        
        if (dayReminders.length > 3) {
            const moreEl = document.createElement('div');
            moreEl.style.cssText = 'font-size: 10px; color: var(--gray-600); font-weight: 600; margin-top: 4px;';
            moreEl.textContent = `+${dayReminders.length - 3} more`;
            dayCell.appendChild(moreEl);
        }
        
        grid.appendChild(dayCell);
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
        
        return `
            <div class="detail-row" style="padding: 12px 0; border-bottom: 1px solid var(--gray-100);">
                <div>
                    <div style="font-weight: 600; color: var(--gray-900);">${r.title}</div>
                    ${r.description ? `<div style="font-size: 13px; color: var(--gray-600); margin-top: 4px;">${r.description}</div>` : ''}
                    <div style="font-size: 12px; color: ${isOverdue ? 'var(--error-red)' : 'var(--accent-orange)'}; margin-top: 4px; font-weight: 600;">
                        ${formatDate(r.due_date)}${isOverdue ? ' (Overdue)' : ''}
                    </div>
                </div>
                <button onclick="completeReminder('${r.id}')" class="btn-secondary" style="padding: 6px 12px; font-size: 13px;">✓ Complete</button>
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