/* ===================================
   PAYMENTS MODULE
   =================================== */

let allPayments = [];
let filteredPayments = [];

document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    if (typeof window.initSidebar === 'function') {
        window.initSidebar('payments');
    }
    await loadPayments();
    renderStats();
    renderPaymentsTable();
    attachEventListeners();
});

async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = '../index.html';
    }
}

async function loadPayments() {
    try {
        const { data, error } = await supabase
            .from('payments')
            .select(`
                *,
                contracts:contract_id (
                    id,
                    contract_value,
                    commission_percentage,
                    players:player_id (
                        first_name,
                        last_name
                    ),
                    teams:team_id (
                        name
                    )
                )
            `)
            .order('due_date', { ascending: false });
        
        if (error) throw error;
        
        allPayments = data || [];
        filteredPayments = allPayments;
        
        console.log('✅ Payments loaded:', allPayments.length);
        populateYearFilter();
    } catch (error) {
        console.error('❌ Error loading payments:', error);
    }
}

function renderStats() {
    const currentYear = new Date().getFullYear();
    
    // Year to Date (paid this year)
    const ytdPayments = allPayments.filter(p => {
        if (!p.paid_date) return false;
        const paidYear = new Date(p.paid_date).getFullYear();
        return paidYear === currentYear;
    });
    const ytdTotal = ytdPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    
    // Pending
    const pendingPayments = allPayments.filter(p => p.status === 'pending');
    const pendingTotal = pendingPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    
    document.getElementById('ytd-total').textContent = `€${ytdTotal.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    document.getElementById('pending-total').textContent = `€${pendingTotal.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    document.getElementById('total-count').textContent = allPayments.length;
}

function renderPaymentsTable() {
    const tbody = document.getElementById('payments-table-body');
    
    if (filteredPayments.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 60px 20px;">
                    <div style="font-size: 48px; margin-bottom: 16px;">💰</div>
                    <p style="color: var(--gray-600); font-size: 16px;">No payments found</p>
                </td>
            </tr>
        `;
        return;
    }
    
    const html = filteredPayments.map(payment => {
        const player = payment.contracts?.players;
        const team = payment.contracts?.teams;
        const playerName = player ? `${player.first_name} ${player.last_name}` : 'Unknown';
        const teamName = team?.name || 'Unknown';
        
        const statusClass = payment.status === 'paid' ? 'signed' : 'free_agent';
        const statusText = payment.status === 'paid' ? 'Paid' : 'Pending';
        
        return `
            <tr>
                <td class="player-name-cell">${playerName}</td>
                <td>${teamName}</td>
                <td style="font-weight: 600;">€${parseFloat(payment.amount || 0).toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                <td>${payment.due_date ? formatDate(payment.due_date) : '-'}</td>
                <td>${payment.paid_date ? formatDate(payment.paid_date) : '-'}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    ${payment.status === 'pending' ? `
                        <button onclick="markAsPaid('${payment.id}')" class="btn-secondary" style="padding: 6px 12px; font-size: 13px;">
                            Mark as Paid
                        </button>
                    ` : '-'}
                </td>
            </tr>
        `;
    }).join('');
    
    tbody.innerHTML = html;
}

async function markAsPaid(paymentId) {
    if (!confirm('Mark this payment as paid?')) return;
    
    try {
        const today = new Date().toISOString().split('T')[0];
        
        const { error } = await supabase
            .from('payments')
            .update({
                status: 'paid',
                paid_date: today
            })
            .eq('id', paymentId);
        
        if (error) throw error;
        
        console.log('✅ Payment marked as paid');
        await loadPayments();
        renderStats();
        renderPaymentsTable();
    } catch (error) {
        console.error('❌ Error updating payment:', error);
        alert('Error updating payment');
    }
}

function populateYearFilter() {
    const years = new Set();
    allPayments.forEach(p => {
        if (p.due_date) {
            const year = new Date(p.due_date).getFullYear();
            years.add(year);
        }
        if (p.paid_date) {
            const year = new Date(p.paid_date).getFullYear();
            years.add(year);
        }
    });
    
    const sortedYears = Array.from(years).sort((a, b) => b - a);
    const select = document.getElementById('filter-year');
    
    sortedYears.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        select.appendChild(option);
    });
}

function applyFilters() {
    const statusFilter = document.getElementById('filter-status').value;
    const yearFilter = document.getElementById('filter-year').value;
    
    filteredPayments = allPayments.filter(payment => {
        const matchesStatus = !statusFilter || payment.status === statusFilter;
        
        let matchesYear = true;
        if (yearFilter) {
            const paymentYear = payment.due_date ? new Date(payment.due_date).getFullYear() : null;
            matchesYear = paymentYear === parseInt(yearFilter);
        }
        
        return matchesStatus && matchesYear;
    });
    
    renderPaymentsTable();
}

function attachEventListeners() {
    document.getElementById('filter-status').addEventListener('change', applyFilters);
    document.getElementById('filter-year').addEventListener('change', applyFilters);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}