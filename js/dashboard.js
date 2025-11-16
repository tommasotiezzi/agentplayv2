/* ===================================
   DASHBOARD - COMPREHENSIVE AGENT VIEW
   =================================== */

let currentUser = null;
let dashboardData = {
    players: [],
    prospects: [],
    contracts: [],
    reminders: [],
    payments: [],
    deals: []
};

document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    if (typeof window.initSidebar === 'function') {
        window.initSidebar('dashboard');
    }
    await loadDashboardData();
    renderDashboard();
});

// Check authentication and load user data
async function checkAuth() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (!session) {
            console.log('❌ No active session, redirecting to login...');
            window.location.href = '../index.html';
            return;
        }
        
        currentUser = session.user;
        console.log('✅ User authenticated:', currentUser);
        
    } catch (error) {
        console.error('❌ Auth check error:', error);
        window.location.href = '../index.html';
    }
}

// Load all dashboard data
async function loadDashboardData() {
    try {
        console.log('📊 Loading dashboard data...');
        
        // Load players
        const { data: playersData, error: playersError } = await supabase
            .from('players')
            .select(`
                *,
                contracts:current_contract_id (
                    id,
                    contract_end_date,
                    teams:team_id (name)
                )
            `);
        
        if (playersError) console.error('Players error:', playersError);
        else dashboardData.players = playersData || [];
        
        // Load prospects
        const { data: prospectsData, error: prospectsError } = await supabase
            .from('prospects')
            .select('*')
            .eq('is_converted', false);
        
        if (prospectsError) console.error('Prospects error:', prospectsError);
        else dashboardData.prospects = prospectsData || [];
        
        // Load active contracts
        const { data: contractsData, error: contractsError } = await supabase
            .from('contracts')
            .select(`
                *,
                players:player_id (first_name, last_name),
                teams:team_id (name)
            `)
            .eq('is_active', true);
        
        if (contractsError) console.error('Contracts error:', contractsError);
        else dashboardData.contracts = contractsData || [];
        
        // Load upcoming reminders
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { data: remindersData, error: remindersError } = await supabase
            .from('reminders')
            .select(`
                *,
                players:player_id (first_name, last_name)
            `)
            .eq('completed', false)
            .gte('due_date', today.toISOString().split('T')[0])
            .order('due_date', { ascending: true })
            .limit(10);
        
        if (remindersError) console.error('Reminders error:', remindersError);
        else dashboardData.reminders = remindersData || [];
        
        // Load pending payments
        const { data: paymentsData, error: paymentsError } = await supabase
            .from('payments')
            .select(`
                *,
                contracts:contract_id (
                    players:player_id (first_name, last_name),
                    teams:team_id (name)
                )
            `)
            .in('status', ['pending', 'overdue'])
            .order('due_date', { ascending: true });
        
        if (paymentsError) console.error('Payments error:', paymentsError);
        else dashboardData.payments = paymentsData || [];
        
        // Load active team deals (negotiations)
        const { data: dealsData, error: dealsError } = await supabase
            .from('team_deals')
            .select(`
                *,
                players:player_id (first_name, last_name),
                teams:team_id (name)
            `)
            .in('status', ['contacted', 'negotiating', 'final_stage'])
            .order('updated_at', { ascending: false });
        
        if (dealsError) console.error('Deals error:', dealsError);
        else dashboardData.deals = dealsData || [];
        
        console.log('✅ Dashboard data loaded:', dashboardData);
        
    } catch (error) {
        console.error('❌ Error loading dashboard data:', error);
    }
}

// Render the dashboard
function renderDashboard() {
    // Update summary cards
    renderSummaryCards();
    
    // Render different sections
    renderUpcomingReminders();
    renderActiveNegotiations();
    renderPendingPayments();
    renderContractExpirations();
    renderRecentActivity();
}

// Render summary cards
function renderSummaryCards() {
    // Players count
    const playersCount = dashboardData.players.length;
    const signedPlayers = dashboardData.players.filter(p => p.player_deal_status === 'signed').length;
    document.getElementById('total-players').textContent = playersCount;
    document.getElementById('signed-players').textContent = `${signedPlayers} Signed`;
    
    // Prospects count
    document.getElementById('total-prospects').textContent = dashboardData.prospects.length;
    
    // Active negotiations
    const activeNegotiations = dashboardData.deals.filter(d => 
        d.status === 'negotiating' || d.status === 'final_stage'
    ).length;
    document.getElementById('active-negotiations').textContent = activeNegotiations;
    
    // Calculate revenue (YTD)
    const currentYear = new Date().getFullYear();
    const ytdRevenue = dashboardData.payments
        .filter(p => {
            const paymentYear = new Date(p.due_date).getFullYear();
            return paymentYear === currentYear && p.status === 'received';
        })
        .reduce((sum, p) => sum + (p.amount || 0), 0);
    
    document.getElementById('ytd-revenue').textContent = `€${formatNumber(ytdRevenue)}`;
    
    // Pending payments
    const pendingAmount = dashboardData.payments
        .filter(p => p.status === 'pending' || p.status === 'overdue')
        .reduce((sum, p) => sum + (p.amount || 0), 0);
    
    const pendingCount = dashboardData.payments.filter(p => 
        p.status === 'pending' || p.status === 'overdue'
    ).length;
    
    document.getElementById('pending-payments').textContent = `€${formatNumber(pendingAmount)}`;
    document.getElementById('pending-count').textContent = `${pendingCount} Pending`;
}

// Render upcoming reminders
function renderUpcomingReminders() {
    const container = document.getElementById('reminders-list');
    
    if (dashboardData.reminders.length === 0) {
        container.innerHTML = '<p class="empty-message">No upcoming reminders</p>';
        return;
    }
    
    const html = dashboardData.reminders.map(reminder => {
        const daysUntil = getDaysUntilDate(reminder.due_date);
        const urgencyClass = daysUntil <= 3 ? 'urgent' : daysUntil <= 7 ? 'warning' : '';
        const playerName = reminder.players ? 
            `${reminder.players.first_name} ${reminder.players.last_name}` : '';
        
        return `
            <div class="list-item ${urgencyClass}">
                <div class="list-item-content">
                    <div class="list-item-title">${reminder.title}</div>
                    ${playerName ? `<div class="list-item-subtitle">${playerName}</div>` : ''}
                    <div class="list-item-date">
                        ${formatDate(reminder.due_date)} 
                        <span class="days-badge">${daysUntil === 0 ? 'Today' : 
                            daysUntil === 1 ? 'Tomorrow' : 
                            `In ${daysUntil} days`}</span>
                    </div>
                </div>
                <button onclick="markReminderComplete('${reminder.id}')" class="btn-small">✓</button>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

// Render active negotiations
function renderActiveNegotiations() {
    const container = document.getElementById('negotiations-list');
    
    const activeDeals = dashboardData.deals.filter(d => 
        d.status === 'negotiating' || d.status === 'final_stage'
    );
    
    if (activeDeals.length === 0) {
        container.innerHTML = '<p class="empty-message">No active negotiations</p>';
        return;
    }
    
    const html = activeDeals.slice(0, 5).map(deal => {
        const playerName = deal.players ? 
            `${deal.players.first_name} ${deal.players.last_name}` : 'Unknown';
        const teamName = deal.teams?.name || 'Unknown Team';
        const statusBadge = deal.status === 'final_stage' ? 
            '<span class="status-badge final">Final Stage</span>' : 
            '<span class="status-badge negotiating">Negotiating</span>';
        
        return `
            <div class="list-item">
                <div class="list-item-content">
                    <div class="list-item-title">${playerName} → ${teamName}</div>
                    <div class="list-item-meta">
                        ${statusBadge}
                        ${deal.proposed_salary ? `<span class="salary">€${formatNumber(deal.proposed_salary)}</span>` : ''}
                    </div>
                    <div class="list-item-date">Updated: ${formatDate(deal.updated_at)}</div>
                </div>
                <a href="deals.html" class="btn-small">View →</a>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

// Render pending payments
function renderPendingPayments() {
    const container = document.getElementById('payments-list');
    
    const pendingPayments = dashboardData.payments.filter(p => 
        p.status === 'pending' || p.status === 'overdue'
    );
    
    if (pendingPayments.length === 0) {
        container.innerHTML = '<p class="empty-message">No pending payments</p>';
        return;
    }
    
    const html = pendingPayments.slice(0, 5).map(payment => {
        const contract = payment.contracts;
        const playerName = contract?.players ? 
            `${contract.players.first_name} ${contract.players.last_name}` : 'Unknown';
        const teamName = contract?.teams?.name || 'Unknown Team';
        const isOverdue = new Date(payment.due_date) < new Date();
        
        return `
            <div class="list-item ${isOverdue ? 'overdue' : ''}">
                <div class="list-item-content">
                    <div class="list-item-title">€${formatNumber(payment.amount)}</div>
                    <div class="list-item-subtitle">${playerName} - ${teamName}</div>
                    <div class="list-item-date">
                        Due: ${formatDate(payment.due_date)}
                        ${isOverdue ? '<span class="badge-overdue">OVERDUE</span>' : ''}
                    </div>
                </div>
                <button onclick="markPaymentReceived('${payment.id}')" class="btn-small success">Mark Received</button>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

// Render contract expirations
function renderContractExpirations() {
    const container = document.getElementById('contracts-expiring');
    
    // Get contracts expiring in next 90 days
    const today = new Date();
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
    
    const expiringContracts = dashboardData.contracts
        .filter(c => {
            const endDate = new Date(c.contract_end_date);
            return endDate >= today && endDate <= ninetyDaysFromNow;
        })
        .sort((a, b) => new Date(a.contract_end_date) - new Date(b.contract_end_date));
    
    if (expiringContracts.length === 0) {
        container.innerHTML = '<p class="empty-message">No contracts expiring soon</p>';
        return;
    }
    
    const html = expiringContracts.slice(0, 5).map(contract => {
        const playerName = contract.players ? 
            `${contract.players.first_name} ${contract.players.last_name}` : 'Unknown';
        const teamName = contract.teams?.name || 'Unknown Team';
        const daysUntil = getDaysUntilDate(contract.contract_end_date);
        const urgencyClass = daysUntil <= 30 ? 'urgent' : daysUntil <= 60 ? 'warning' : '';
        
        return `
            <div class="list-item ${urgencyClass}">
                <div class="list-item-content">
                    <div class="list-item-title">${playerName}</div>
                    <div class="list-item-subtitle">${teamName}</div>
                    <div class="list-item-date">
                        Expires: ${formatDate(contract.contract_end_date)}
                        <span class="days-badge ${urgencyClass}">${daysUntil} days</span>
                    </div>
                </div>
                <a href="players.html" class="btn-small">View →</a>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

// Render recent activity
function renderRecentActivity() {
    const container = document.getElementById('recent-activity');
    
    // Combine and sort recent activities
    const activities = [];
    
    // Recent deals
    dashboardData.deals.slice(0, 3).forEach(deal => {
        activities.push({
            type: 'deal',
            title: `Deal update: ${deal.players?.first_name} ${deal.players?.last_name}`,
            subtitle: `${deal.teams?.name} - Status: ${formatDealStatus(deal.status)}`,
            date: deal.updated_at,
            icon: '🤝'
        });
    });
    
    // Recent player additions
    dashboardData.players.slice(0, 2).forEach(player => {
        activities.push({
            type: 'player',
            title: `New player: ${player.first_name} ${player.last_name}`,
            subtitle: `Status: ${formatPlayerStatus(player.player_deal_status)}`,
            date: player.created_at,
            icon: '👤'
        });
    });
    
    // Sort by date
    activities.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (activities.length === 0) {
        container.innerHTML = '<p class="empty-message">No recent activity</p>';
        return;
    }
    
    const html = activities.slice(0, 5).map(activity => `
        <div class="activity-item">
            <div class="activity-icon">${activity.icon}</div>
            <div class="activity-content">
                <div class="activity-title">${activity.title}</div>
                <div class="activity-subtitle">${activity.subtitle}</div>
                <div class="activity-date">${formatRelativeTime(activity.date)}</div>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

// Utility functions
function getDaysUntilDate(dateString) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(dateString);
    targetDate.setHours(0, 0, 0, 0);
    const diffTime = targetDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return formatDate(dateString);
}

function formatNumber(number) {
    if (!number) return '0';
    return new Intl.NumberFormat('it-IT', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(number);
}

function formatDealStatus(status) {
    const statusMap = {
        'contacted': 'Contacted',
        'negotiating': 'Negotiating',
        'final_stage': 'Final Stage',
        'signed': 'Signed'
    };
    return statusMap[status] || status;
}

function formatPlayerStatus(status) {
    const statusMap = {
        'free_agent': 'Free Agent',
        'in_negotiation': 'In Negotiation',
        'signed': 'Signed'
    };
    return statusMap[status] || status;
}

// Action functions
async function markReminderComplete(reminderId) {
    try {
        const { error } = await supabase
            .from('reminders')
            .update({ completed: true })
            .eq('id', reminderId);
        
        if (error) throw error;
        
        await loadDashboardData();
        renderDashboard();
    } catch (error) {
        console.error('Error marking reminder complete:', error);
    }
}

async function markPaymentReceived(paymentId) {
    try {
        const { error } = await supabase
            .from('payments')
            .update({ 
                status: 'received',
                received_date: new Date().toISOString()
            })
            .eq('id', paymentId);
        
        if (error) throw error;
        
        await loadDashboardData();
        renderDashboard();
    } catch (error) {
        console.error('Error marking payment received:', error);
    }
}

// Auto-refresh dashboard every 60 seconds
setInterval(async () => {
    await loadDashboardData();
    renderDashboard();
}, 60000);

// Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event);
    
    if (event === 'SIGNED_OUT') {
        window.location.href = '../index.html';
    }
});