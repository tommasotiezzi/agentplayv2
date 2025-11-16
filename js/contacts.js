/* ===================================
   CONTACTS MODULE
   =================================== */

let allContacts = [];
let filteredContacts = [];
let teams = [];

document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    if (typeof window.initSidebar === 'function') {
        window.initSidebar('contacts');
    }
    await loadTeams();
    await loadContacts();
    populateTeamFilters();
    attachEventListeners();
});

async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = '../index.html';
    }
}

async function loadTeams() {
    const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('name');
    
    if (!error) {
        teams = data || [];
    }
}

async function loadContacts() {
    try {
        const { data, error } = await supabase
            .from('contacts')
            .select(`
                *,
                teams:team_id (name),
                players:player_id (first_name, last_name)
            `)
            .order('name');
        
        if (error) throw error;
        
        allContacts = data || [];
        filteredContacts = allContacts;
        
        console.log('✅ Contacts loaded:', allContacts.length);
        renderContacts();
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

function renderContacts() {
    const tbody = document.getElementById('contacts-table-body');
    
    if (filteredContacts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;">No contacts found</td></tr>';
        return;
    }
    
    const html = filteredContacts.map(contact => {
        const teamName = contact.teams?.name || '-';
        const roleBadge = contact.role ? `<span class="status-badge free_agent">${contact.role}</span>` : '-';
        const isPlayer = contact.player_id !== null;
        
        return `
            <tr>
                <td class="player-name-cell">
                    ${contact.name}
                    ${isPlayer ? '<span style="font-size: 11px; color: var(--primary-blue); margin-left: 6px;">👤 Player</span>' : ''}
                </td>
                <td>${roleBadge}</td>
                <td>${teamName}</td>
                <td>${contact.email || '-'}</td>
                <td>${contact.phone || '-'}</td>
                <td>
                    ${!isPlayer ? `
                        <button onclick="editContact('${contact.id}')" class="btn-secondary" style="padding: 6px 12px; font-size: 13px; margin-right: 8px;">Edit</button>
                        <button onclick="deleteContact('${contact.id}')" class="btn-danger" style="padding: 6px 12px; font-size: 13px;">Delete</button>
                    ` : '<span style="font-size: 12px; color: var(--gray-500);">Auto-synced</span>'}
                </td>
            </tr>
        `;
    }).join('');
    
    tbody.innerHTML = html;
}

function populateTeamFilters() {
    // Filter dropdown
    const filterSelect = document.getElementById('filter-team');
    teams.forEach(team => {
        const option = document.createElement('option');
        option.value = team.id;
        option.textContent = team.name;
        filterSelect.appendChild(option);
    });
    
    // Modal dropdown
    const modalSelect = document.getElementById('contact_team');
    teams.forEach(team => {
        const option = document.createElement('option');
        option.value = team.id;
        option.textContent = team.name;
        modalSelect.appendChild(option);
    });
}

function applyFilters() {
    const search = document.getElementById('search-input').value.toLowerCase();
    const roleFilter = document.getElementById('filter-role').value;
    const teamFilter = document.getElementById('filter-team').value;
    
    filteredContacts = allContacts.filter(contact => {
        const matchesSearch = !search || 
            contact.name.toLowerCase().includes(search) ||
            (contact.email && contact.email.toLowerCase().includes(search)) ||
            (contact.phone && contact.phone.includes(search));
        
        const matchesRole = !roleFilter || contact.role === roleFilter;
        const matchesTeam = !teamFilter || contact.team_id === teamFilter;
        
        return matchesSearch && matchesRole && matchesTeam;
    });
    
    renderContacts();
}

function openModal(contact = null) {
    const modal = document.getElementById('contact-modal');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('contact-form');
    
    form.reset();
    
    if (contact) {
        title.textContent = 'Edit Contact';
        document.getElementById('contact_id').value = contact.id;
        document.getElementById('contact_name').value = contact.name;
        document.getElementById('contact_role').value = contact.role || '';
        document.getElementById('contact_email').value = contact.email || '';
        document.getElementById('contact_phone').value = contact.phone || '';
        document.getElementById('contact_team').value = contact.team_id || '';
        document.getElementById('contact_notes').value = contact.notes || '';
    } else {
        title.textContent = 'Add Contact';
        document.getElementById('contact_id').value = '';
    }
    
    modal.style.display = 'flex';
}

function editContact(contactId) {
    const contact = allContacts.find(c => c.id === contactId);
    if (contact) {
        openModal(contact);
    }
}

async function deleteContact(contactId) {
    if (!confirm('Delete this contact?')) return;
    
    try {
        const { error } = await supabase
            .from('contacts')
            .delete()
            .eq('id', contactId);
        
        if (error) throw error;
        
        await loadContacts();
        alert('✅ Contact deleted');
    } catch (error) {
        console.error('❌ Error:', error);
        alert('Error deleting contact');
    }
}

async function saveContact(e) {
    e.preventDefault();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        console.error('❌ Could not get user:', userError);
        alert('Authentication error. Please refresh the page and try again.');
        return;
    }
    
    const contactId = document.getElementById('contact_id').value;
    const contactData = {
        user_id: user.id,  // ADD USER_ID for RLS policies
        name: document.getElementById('contact_name').value,
        role: document.getElementById('contact_role').value || null,
        email: document.getElementById('contact_email').value || null,
        phone: document.getElementById('contact_phone').value || null,
        team_id: document.getElementById('contact_team').value || null,
        notes: document.getElementById('contact_notes').value || null
    };
    
    try {
        let result;
        if (contactId) {
            // Update
            result = await supabase
                .from('contacts')
                .update(contactData)
                .eq('id', contactId);
        } else {
            // Insert
            result = await supabase
                .from('contacts')
                .insert([contactData]);
        }
        
        if (result.error) throw result.error;
        
        await loadContacts();
        document.getElementById('contact-modal').style.display = 'none';
        alert('✅ Contact saved');
    } catch (error) {
        console.error('❌ Error:', error);
        alert('Error saving contact');
    }
}

function attachEventListeners() {
    document.getElementById('btn-add-contact').addEventListener('click', () => openModal());
    document.getElementById('contact-form').addEventListener('submit', saveContact);
    document.getElementById('close-contact-modal').addEventListener('click', () => {
        document.getElementById('contact-modal').style.display = 'none';
    });
    document.getElementById('cancel-contact').addEventListener('click', () => {
        document.getElementById('contact-modal').style.display = 'none';
    });
    
    document.getElementById('search-input').addEventListener('input', applyFilters);
    document.getElementById('filter-role').addEventListener('change', applyFilters);
    document.getElementById('filter-team').addEventListener('change', applyFilters);
    
    document.getElementById('contact-modal').addEventListener('click', (e) => {
        if (e.target.id === 'contact-modal') {
            document.getElementById('contact-modal').style.display = 'none';
        }
    });
}