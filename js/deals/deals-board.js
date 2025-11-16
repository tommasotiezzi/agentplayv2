/* ===================================
   DEALS BOARD - COMPLETE FUNCTIONALITY
   Player Deals Board (Level 1) + Team Deals Modal (Level 2)
   =================================== */

// ===================================
// GLOBAL STATE
// ===================================

let allPlayers = [];
let currentPlayer = null;
let currentTeamDeals = [];
let allTeams = [];
let sortableInstances = [];

// ===================================
// INITIALIZATION
// ===================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Deals Board - Initializing...');
    
    try {
        // Check auth
        await checkAuth();
        
        // Init sidebar
        if (typeof window.initSidebar === 'function') {
            window.initSidebar('deals');
        }
        
        // Load data
        await Promise.all([
            loadPlayers(),
            loadTeams()
        ]);
        
        // Setup drag & drop
        initDragAndDrop();
        
        // Attach event listeners
        attachEventListeners();
        
        console.log('✅ Deals Board ready!');
        
    } catch (error) {
        console.error('💥 Initialization error:', error);
        alert('Error loading deals board. Please refresh.');
    }
});

async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = '../index.html';
    }
}

// ===================================
// LOAD DATA
// ===================================

async function loadPlayers() {
    console.log('📥 Loading players...');
    
    try {
        const { data, error } = await supabase
            .from('players')
            .select(`
                *,
                team_deals (
                    id,
                    team_id,
                    deal_stage,
                    teams:team_id (
                        name
                    )
                )
            `)
            .order('last_name');
        
        if (error) throw error;
        
        allPlayers = data || [];
        console.log('✅ Players loaded:', allPlayers.length);
        
        renderPlayerBoard();
        
    } catch (error) {
        console.error('❌ Error loading players:', error);
        throw error;
    }
}

async function loadTeams() {
    console.log('📥 Loading teams...');
    
    try {
        const { data, error } = await supabase
            .from('teams')
            .select(`
                *,
                competitions:competition_id (
                    name
                )
            `)
            .order('name');
        
        if (error) throw error;
        
        allTeams = data || [];
        console.log('✅ Teams loaded:', allTeams.length);
        
    } catch (error) {
        console.error('❌ Error loading teams:', error);
        throw error;
    }
}

// ===================================
// RENDER PLAYER BOARD (LEVEL 1)
// ===================================

function renderPlayerBoard() {
    console.log('🎨 Rendering player board...');
    
    // Group players by status
    const grouped = {
        free_agent: allPlayers.filter(p => p.player_deal_status === 'free_agent'),
        in_negotiation: allPlayers.filter(p => p.player_deal_status === 'in_negotiation'),
        signed: allPlayers.filter(p => p.player_deal_status === 'signed')
    };
    
    // Update counts
    document.getElementById('count-free-agent').textContent = grouped.free_agent.length;
    document.getElementById('count-in-negotiation').textContent = grouped.in_negotiation.length;
    document.getElementById('count-signed').textContent = grouped.signed.length;
    
    // Render each column
    renderPlayerColumn('free_agent', grouped.free_agent);
    renderPlayerColumn('in_negotiation', grouped.in_negotiation);
    renderPlayerColumn('signed', grouped.signed);
}

function renderPlayerColumn(status, players) {
    const statusId = status.replace(/_/g, '-'); // Convert free_agent to free-agent
    const container = document.getElementById(`cards-${statusId}`);
    
    if (!container) {
        console.error('Container not found for status:', status);
        return;
    }
    
    if (players.length === 0) {
        container.innerHTML = '<div class="loading-placeholder">No players</div>';
        return;
    }
    
    const html = players.map(player => {
        const initials = `${player.first_name[0]}${player.last_name[0]}`;
        const age = calculateAge(player.date_of_birth);
        const activeDeals = player.team_deals?.filter(d => 
            d.deal_stage === 'ongoing' || d.deal_stage === 'sent'
        ).length || 0;
        
        return `
            <div class="player-card" data-player-id="${player.id}">
                <div class="player-card-header">
                    <div class="player-avatar">${initials}</div>
                    <div class="player-card-info">
                        <h4 class="player-card-name">${player.first_name} ${player.last_name}</h4>
                        <div class="player-card-meta">
                            <span>${player.position || 'N/A'}</span>
                            <span>•</span>
                            <span>${age || 'N/A'} yrs</span>
                        </div>
                    </div>
                </div>
                ${activeDeals > 0 ? `<span class="deals-badge">${activeDeals}</span>` : ''}
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

// ===================================
// DRAG & DROP - PLAYER BOARD
// ===================================

function initDragAndDrop() {
    console.log('🎯 Initializing drag & drop...');
    
    // Destroy existing instances
    sortableInstances.forEach(instance => instance.destroy());
    sortableInstances = [];
    
    // Player board columns - use dash instead of underscore
    const playerColumns = ['free-agent', 'in-negotiation', 'signed'];
    
    playerColumns.forEach(statusId => {
        const element = document.getElementById(`cards-${statusId}`);
        if (!element) return;
        
        const sortable = new Sortable(element, {
            group: 'players',
            animation: 200,
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',
            onEnd: async (evt) => {
                const playerId = evt.item.dataset.playerId;
                const newStatusId = evt.to.dataset.status;
                
                console.log('📍 Player dropped:', playerId, '→', newStatusId);
                
                await handlePlayerMove(playerId, newStatusId);
            }
        });
        
        sortableInstances.push(sortable);
    });
}

async function handlePlayerMove(playerId, newStatus) {
    try {
        console.log('🔄 Moving player to:', newStatus);
        
        // Update player status in database
        const { error } = await supabase
            .from('players')
            .update({ player_deal_status: newStatus })
            .eq('id', playerId);
        
        if (error) throw error;
        
        console.log('✅ Player status updated');
        
        // Reload data to reflect changes
        await loadPlayers();
        
    } catch (error) {
        console.error('❌ Error moving player:', error);
        alert('Error updating player status. Please try again.');
        await loadPlayers(); // Revert on error
    }
}

// ===================================
// OPEN TEAM DEALS MODAL (LEVEL 2)
// ===================================

async function openTeamDealsModal(playerId) {
    try {
        console.log('📂 Opening team deals for player:', playerId);
        
        currentPlayer = allPlayers.find(p => p.id === playerId);
        
        if (!currentPlayer) {
            console.error('Player not found');
            return;
        }
        
        // Update modal header
        const initials = `${currentPlayer.first_name[0]}${currentPlayer.last_name[0]}`;
        document.getElementById('modal-player-avatar').textContent = initials;
        document.getElementById('modal-player-name').textContent = 
            `${currentPlayer.first_name} ${currentPlayer.last_name}`;
        
        const age = calculateAge(currentPlayer.date_of_birth);
        document.getElementById('modal-player-meta').textContent = 
            `${currentPlayer.position || 'N/A'} • ${age || 'N/A'} years`;
        
        // Load team deals
        await loadTeamDeals(playerId);
        
        // Show modal
        document.getElementById('team-deals-modal').style.display = 'flex';
        
    } catch (error) {
        console.error('❌ Error opening modal:', error);
        alert('Error loading team deals. Please try again.');
    }
}

async function loadTeamDeals(playerId) {
    console.log('📥 Loading team deals for player:', playerId);
    
    try {
        const { data, error } = await supabase
            .from('team_deals')
            .select(`
                *,
                teams:team_id (
                    id,
                    name,
                    city,
                    competitions:competition_id (
                        name
                    )
                ),
                deal_notes (
                    id,
                    note_text,
                    created_at,
                    deal_stage_at_time
                )
            `)
            .eq('player_id', playerId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        currentTeamDeals = data || [];
        console.log('✅ Team deals loaded:', currentTeamDeals.length);
        
        renderTeamDealsBoard();
        renderNotesPanel();
        populateTeamSelectors();
        initTeamDealsDragDrop();
        
    } catch (error) {
        console.error('❌ Error loading team deals:', error);
        throw error;
    }
}

// Global function for reload after contract creation
window.loadTeamDealsAfterContract = async function(playerId) {
    if (currentPlayer && currentPlayer.id === playerId) {
        await loadTeamDeals(playerId);
        await loadPlayers(); // Refresh player board too
    }
};

// ===================================
// RENDER TEAM DEALS BOARD
// ===================================

function renderTeamDealsBoard() {
    console.log('🎨 Rendering team deals board...');
    
    const grouped = {
        ongoing: currentTeamDeals.filter(d => d.deal_stage === 'ongoing'),
        sent: currentTeamDeals.filter(d => d.deal_stage === 'sent'),
        signed: currentTeamDeals.filter(d => d.deal_stage === 'signed'),
        not_signed: currentTeamDeals.filter(d => d.deal_stage === 'not_signed')
    };
    
    // Update counts
    document.getElementById('team-count-ongoing').textContent = grouped.ongoing.length;
    document.getElementById('team-count-sent').textContent = grouped.sent.length;
    document.getElementById('team-count-signed').textContent = grouped.signed.length;
    document.getElementById('team-count-not_signed').textContent = grouped.not_signed.length;
    
    // Render each column
    ['ongoing', 'sent', 'signed', 'not_signed'].forEach(stage => {
        renderTeamColumn(stage, grouped[stage]);
    });
}

function renderTeamColumn(stage, deals) {
    const container = document.getElementById(`team-cards-${stage}`);
    
    if (deals.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    const html = deals.map(deal => {
        const lastNote = deal.deal_notes && deal.deal_notes.length > 0 
            ? deal.deal_notes[0].note_text 
            : '';
        
        const daysAgo = getDaysAgo(deal.updated_at);
        const reminderCount = 0; // TODO: Get from reminders table
        
        return `
            <div class="team-deal-card" data-deal-id="${deal.id}" data-team-id="${deal.team_id}">
                <div class="team-card-header">
                    <span class="team-icon">🏀</span>
                    <div class="team-card-info">
                        <h5 class="team-name">${deal.teams?.name || 'Unknown'}</h5>
                        <div class="team-competition">${deal.teams?.competitions?.name || ''}</div>
                    </div>
                </div>
                <div class="team-card-meta">${daysAgo}</div>
                ${lastNote ? `<div class="team-card-note-preview">"${lastNote.substring(0, 50)}..."</div>` : ''}
                ${reminderCount > 0 ? `<div class="reminder-badge">🔔 ${reminderCount}</div>` : ''}
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

// ===================================
// DRAG & DROP - TEAM DEALS
// ===================================

function initTeamDealsDragDrop() {
    console.log('🎯 Initializing team deals drag & drop...');
    
    const stages = ['ongoing', 'sent', 'signed', 'not_signed'];
    
    stages.forEach(stage => {
        const element = document.getElementById(`team-cards-${stage}`);
        if (!element) return;
        
        const sortable = new Sortable(element, {
            group: 'team-deals',
            animation: 200,
            ghostClass: 'sortable-ghost',
            onEnd: async (evt) => {
                const dealId = evt.item.dataset.dealId;
                const newStage = evt.to.dataset.stage;
                
                console.log('📍 Deal dropped:', dealId, '→', newStage);
                
                await handleDealMove(dealId, newStage);
            }
        });
        
        sortableInstances.push(sortable);
    });
}

async function handleDealMove(dealId, newStage) {
    try {
        console.log('🔄 Moving deal to:', newStage);
        
        // If moving to "signed", open contract manager directly
        if (newStage === 'signed') {
            // Find the deal to get team info
            const deal = currentTeamDeals.find(d => d.id === dealId);
            
            if (!deal) {
                console.error('Deal not found');
                return;
            }
            
            console.log('🎉 Deal signed! Opening contract manager...');
            
            // Update deal stage first
            await updateDealStage(dealId, newStage);
            
            // Store deal info for contract pre-population
            window.currentSignedDeal = {
                dealId: dealId,
                teamId: deal.team_id,
                teamName: deal.teams?.name,
                competitionId: deal.teams?.competition_id
            };
            
            // Store dealId for contract linking
            window.currentContractDealId = dealId;
            
            // Open contract manager
            if (window.openContractManager && currentPlayer) {
                await window.openContractManager(currentPlayer.id);
            } else {
                console.error('❌ Contract Manager not loaded!');
                alert('Contract Manager not available. Please refresh the page.');
            }
            
            return;
        }
        
        // Regular stage update
        await updateDealStage(dealId, newStage);
        
    } catch (error) {
        console.error('❌ Error moving deal:', error);
        alert('Error updating deal. Please try again.');
        await loadTeamDeals(currentPlayer.id);
    }
}

async function updateDealStage(dealId, newStage) {
    const { error } = await supabase
        .from('team_deals')
        .update({ 
            deal_stage: newStage,
            updated_at: new Date().toISOString()
        })
        .eq('id', dealId);
    
    if (error) throw error;
    
    console.log('✅ Deal stage updated');
    
    // Reload data
    await Promise.all([
        loadTeamDeals(currentPlayer.id),
        loadPlayers() // Update player board counts
    ]);
}

// ===================================
// NOTES PANEL
// ===================================

async function renderNotesPanel() {
    const notesList = document.getElementById('notes-list');
    
    // Get all notes from all deals
    const allNotes = [];
    currentTeamDeals.forEach(deal => {
        if (deal.deal_notes) {
            deal.deal_notes.forEach(note => {
                allNotes.push({
                    type: 'note',
                    ...note,
                    team_name: deal.teams?.name,
                    team_id: deal.team_id
                });
            });
        }
    });
    
    // Get reminders for current deals
    const reminders = await loadRemindersForDeals();
    reminders.forEach(reminder => {
        const deal = currentTeamDeals.find(d => d.id === reminder.team_deal_id);
        allNotes.push({
            type: 'reminder',
            ...reminder,
            team_name: deal?.teams?.name || 'General',
            team_id: deal?.team_id
        });
    });
    
    // Sort by date
    allNotes.sort((a, b) => {
        const dateA = new Date(a.created_at || a.due_date);
        const dateB = new Date(b.created_at || b.due_date);
        return dateB - dateA;
    });
    
    if (allNotes.length === 0) {
        notesList.innerHTML = '<div class="notes-empty"><p>No notes or reminders yet</p></div>';
        return;
    }
    
    const html = allNotes.map(item => {
        if (item.type === 'reminder') {
            return `
                <div class="note-item reminder-item ${item.completed ? 'reminder-completed' : ''}">
                    <div class="note-header">
                        <span class="note-team-name">
                            <span class="reminder-icon">🔔</span>
                            ${item.team_name}
                        </span>
                        <span class="note-date">${formatDateTime(item.created_at)}</span>
                    </div>
                    <div class="note-text"><strong>${item.title}</strong></div>
                    ${item.description ? `<div class="note-text" style="margin-top: 4px;">${item.description}</div>` : ''}
                    ${item.due_date ? `<div>${formatReminderDueDate(item.due_date)}</div>` : ''}
                    <button class="btn-sm btn-secondary" onclick="toggleReminderComplete('${item.id}', ${!item.completed})" style="margin-top: 8px;">
                        ${item.completed ? 'Mark Incomplete' : 'Mark Complete'}
                    </button>
                </div>
            `;
        } else {
            return `
                <div class="note-item">
                    <div class="note-header">
                        <span class="note-team-name">🏀 ${item.team_name}</span>
                        <span class="note-date">${formatDateTime(item.created_at)}</span>
                    </div>
                    <div class="note-text">${item.note_text}</div>
                    ${item.deal_stage_at_time ? `<span class="note-stage-badge">${item.deal_stage_at_time}</span>` : ''}
                </div>
            `;
        }
    }).join('');
    
    notesList.innerHTML = html;
}

function populateTeamSelectors() {
    // Populate team selector in add note form
    const selector = document.getElementById('note-team-select');
    const filter = document.getElementById('notes-filter-team');
    
    const options = currentTeamDeals.map(deal => 
        `<option value="${deal.team_id}">${deal.teams?.name || 'Unknown'}</option>`
    ).join('');
    
    selector.innerHTML = '<option value="">Select Team *</option>' + options;
    filter.innerHTML = '<option value="">All Teams</option>' + options;
}

async function addNote() {
    const teamId = document.getElementById('note-team-select').value;
    const noteText = document.getElementById('note-text-input').value.trim();
    
    if (!teamId) {
        alert('Please select a team');
        return;
    }
    
    if (!noteText) {
        alert('Please enter a note');
        return;
    }
    
    try {
        // Find the deal
        const deal = currentTeamDeals.find(d => d.team_id === teamId);
        
        if (!deal) {
            alert('Deal not found');
            return;
        }
        
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            console.error('❌ Could not get user:', userError);
            alert('Authentication error. Please refresh the page and try again.');
            return;
        }
        
        const { error } = await supabase
            .from('deal_notes')
            .insert([{
                user_id: user.id,  // ADD USER_ID for RLS policies
                team_deal_id: deal.id,
                note_text: noteText,
                deal_stage_at_time: deal.deal_stage
            }]);
        
        if (error) throw error;
        
        console.log('✅ Note added');
        
        // Clear form
        document.getElementById('note-text-input').value = '';
        document.getElementById('note-team-select').value = '';
        
        // Reload
        await loadTeamDeals(currentPlayer.id);
        
    } catch (error) {
        console.error('❌ Error adding note:', error);
        alert('Error adding note. Please try again.');
    }
}

// ===================================
// ADD TEAM DEAL
// ===================================

function showAddTeamDropdown() {
    const dropdown = document.getElementById('add-team-dropdown');
    const button = document.getElementById('btn-add-team-deal');
    const rect = button.getBoundingClientRect();
    
    // Position dropdown
    dropdown.style.top = `${rect.bottom + 5}px`;
    dropdown.style.left = `${rect.left}px`;
    dropdown.style.display = 'block';
    
    // Populate teams
    renderTeamDropdown();
    
    // Focus search
    document.getElementById('team-search').focus();
}

function renderTeamDropdown(searchTerm = '') {
    const list = document.getElementById('team-dropdown-list');
    
    // Filter teams already in deals
    const existingTeamIds = currentTeamDeals.map(d => d.team_id);
    const availableTeams = allTeams.filter(t => !existingTeamIds.includes(t.id));
    
    // Filter by search
    const filtered = availableTeams.filter(t => 
        t.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (filtered.length === 0) {
        list.innerHTML = '<div class="dropdown-item">No teams available</div>';
        return;
    }
    
    const html = filtered.map(team => `
        <div class="dropdown-item" data-team-id="${team.id}">
            <div class="dropdown-item-name">${team.name}</div>
            <div class="dropdown-item-meta">${team.competitions?.name || ''}</div>
        </div>
    `).join('');
    
    list.innerHTML = html;
    
    // Attach click handlers
    document.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', async () => {
            const teamId = item.dataset.teamId;
            if (teamId) {
                await createTeamDeal(teamId);
                hideAddTeamDropdown();
            }
        });
    });
}

function hideAddTeamDropdown() {
    document.getElementById('add-team-dropdown').style.display = 'none';
}

async function createTeamDeal(teamId) {
    try {
        console.log('➕ Creating team deal:', teamId);
        
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            console.error('❌ Could not get user:', userError);
            alert('Authentication error. Please refresh the page and try again.');
            return;
        }
        
        const { error } = await supabase
            .from('team_deals')
            .insert([{
                user_id: user.id,  // ADD USER_ID for RLS policies
                player_id: currentPlayer.id,
                team_id: teamId,
                deal_stage: 'ongoing'
            }]);
        
        if (error) throw error;
        
        console.log('✅ Team deal created');
        
        // Reload
        await Promise.all([
            loadTeamDeals(currentPlayer.id),
            loadPlayers()
        ]);
        
    } catch (error) {
        console.error('❌ Error creating deal:', error);
        alert('Error creating deal. Please try again.');
    }
}

// ===================================
// EVENT LISTENERS
// ===================================

function attachEventListeners() {
    // Player card click
    document.addEventListener('click', (e) => {
        const card = e.target.closest('.player-card');
        if (card) {
            const playerId = card.dataset.playerId;
            openTeamDealsModal(playerId);
        }
    });
    
    // Refresh button
    document.getElementById('btn-refresh')?.addEventListener('click', async () => {
        await loadPlayers();
    });
    
    // Search
    document.getElementById('search-players')?.addEventListener('input', (e) => {
        // TODO: Implement search filter
    });
    
    // Close modal
    document.getElementById('close-team-deals-modal')?.addEventListener('click', closeTeamDealsModal);
    document.getElementById('btn-back-to-board')?.addEventListener('click', closeTeamDealsModal);
    
    // Add team deal
    document.getElementById('btn-add-team-deal')?.addEventListener('click', showAddTeamDropdown);
    
    // Team search
    document.getElementById('team-search')?.addEventListener('input', (e) => {
        renderTeamDropdown(e.target.value);
    });
    
    // Add note
    document.getElementById('btn-add-note')?.addEventListener('click', addNote);
    
    // Add reminder (both buttons)
    document.getElementById('btn-add-reminder')?.addEventListener('click', openAddReminderModal);
    document.getElementById('btn-add-reminder-header')?.addEventListener('click', openAddReminderModal);
    
    // Notes filter
    document.getElementById('notes-filter-team')?.addEventListener('change', (e) => {
        // TODO: Filter notes by team
    });
    
    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('add-team-dropdown');
        const button = document.getElementById('btn-add-team-deal');
        
        if (dropdown && dropdown.style.display === 'block') {
            if (!dropdown.contains(e.target) && e.target !== button && !button.contains(e.target)) {
                hideAddTeamDropdown();
            }
        }
    });
    
    // Close modal on outside click
    document.getElementById('team-deals-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'team-deals-modal') {
            closeTeamDealsModal();
        }
    });
}

function closeTeamDealsModal() {
    document.getElementById('team-deals-modal').style.display = 'none';
    currentPlayer = null;
    currentTeamDeals = [];
}

// ===================================
// UTILITY FUNCTIONS
// ===================================

function calculateAge(dateOfBirth) {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birth = new Date(dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
}

function getDaysAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const days = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ===================================
// REMINDERS SYSTEM
// ===================================

function openAddReminderModal() {
    console.log('🔔 Opening add reminder modal...');
    
    const modal = document.getElementById('add-reminder-modal');
    const form = document.getElementById('add-reminder-form');
    
    // Reset form
    form.reset();
    
    // Pre-select 'deal' tag if we're in deals context
    if (currentPlayer) {
        document.getElementById('reminder_tag').value = 'deal';
        
        // Show and populate deal selector
        const linkSection = document.getElementById('reminder-link-section');
        const dealSelect = document.getElementById('reminder_team_deal');
        
        if (currentTeamDeals && currentTeamDeals.length > 0) {
            linkSection.style.display = 'block';
            
            const options = currentTeamDeals.map(deal => 
                `<option value="${deal.id}">${deal.teams?.name || 'Unknown'}</option>`
            ).join('');
            
            dealSelect.innerHTML = '<option value="">None</option>' + options;
        }
    }
    
    // Show modal
    modal.style.display = 'flex';
}

function closeAddReminderModal() {
    document.getElementById('add-reminder-modal').style.display = 'none';
}

async function saveReminder(e) {
    e.preventDefault();
    
    try {
        console.log('💾 Saving reminder...');
        
        const formData = {
            title: document.getElementById('reminder_title').value.trim(),
            description: document.getElementById('reminder_description').value.trim() || null,
            due_date: document.getElementById('reminder_due_date').value || null,
            tag: document.getElementById('reminder_tag').value,
            completed: false,
            auto_generated: false
        };
        
        // Add references based on context
        if (currentPlayer) {
            formData.player_id = currentPlayer.id;
        }
        
        const teamDealId = document.getElementById('reminder_team_deal')?.value;
        if (teamDealId) {
            formData.team_deal_id = teamDealId;
        }
        
        const { data, error } = await supabase
            .from('reminders')
            .insert([formData])
            .select()
            .single();
        
        if (error) throw error;
        
        console.log('✅ Reminder saved:', data);
        
        // Close modal
        closeAddReminderModal();
        
        // Reload if in deals context
        if (currentPlayer) {
            await loadTeamDeals(currentPlayer.id);
        }
        
        alert('✅ Reminder added successfully!');
        
    } catch (error) {
        console.error('❌ Error saving reminder:', error);
        alert('Error saving reminder. Please try again.');
    }
}

async function loadRemindersForDeals() {
    if (!currentTeamDeals || currentTeamDeals.length === 0) return [];
    
    try {
        const dealIds = currentTeamDeals.map(d => d.id);
        
        const { data, error } = await supabase
            .from('reminders')
            .select('*')
            .in('team_deal_id', dealIds)
            .eq('completed', false)
            .order('due_date', { ascending: true });
        
        if (error) throw error;
        
        return data || [];
        
    } catch (error) {
        console.error('❌ Error loading reminders:', error);
        return [];
    }
}

async function toggleReminderComplete(reminderId, completed) {
    try {
        const { error } = await supabase
            .from('reminders')
            .update({ 
                completed: completed,
                updated_at: new Date().toISOString()
            })
            .eq('id', reminderId);
        
        if (error) throw error;
        
        // Reload
        if (currentPlayer) {
            await loadTeamDeals(currentPlayer.id);
        }
        
    } catch (error) {
        console.error('❌ Error toggling reminder:', error);
    }
}

function formatReminderDueDate(dueDate) {
    if (!dueDate) return '';
    
    const date = new Date(dueDate);
    const today = new Date();
    const diffDays = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
        return `<span class="reminder-overdue">Overdue ${Math.abs(diffDays)} days</span>`;
    } else if (diffDays === 0) {
        return '<span class="reminder-due-date">Due today</span>';
    } else if (diffDays === 1) {
        return '<span class="reminder-due-date">Due tomorrow</span>';
    } else {
        return `<span class="reminder-due-date">Due in ${diffDays} days</span>`;
    }
}

// Attach reminder form submit
document.addEventListener('DOMContentLoaded', () => {
    const reminderForm = document.getElementById('add-reminder-form');
    if (reminderForm) {
        reminderForm.addEventListener('submit', saveReminder);
    }
    
    // Close reminder modal
    document.getElementById('close-reminder-modal')?.addEventListener('click', closeAddReminderModal);
    document.getElementById('cancel-reminder')?.addEventListener('click', closeAddReminderModal);
    
    // Close on outside click
    document.getElementById('add-reminder-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'add-reminder-modal') {
            closeAddReminderModal();
        }
    });
});

console.log('✅ Deals board module loaded');