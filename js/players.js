/* ===================================
   PLAYERS MODULE - FULL LOGIC WITH CONTRACT HISTORY
   =================================== */

let allPlayers = [];
let filteredPlayers = [];
let currentTab = 'under-management';
let currentPlayer = null;

// ===================================
// INITIALIZATION
// ===================================

document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🚀 Players.js - DOMContentLoaded fired');
        
        const authResult = await checkAuth();
        console.log('🔐 Auth check completed:', authResult);
        
        if (typeof window.initSidebar === 'function') {
            console.log('✅ Sidebar function available, initializing...');
            window.initSidebar('players');
        } else {
            console.warn('⚠️ Sidebar component not loaded yet');
        }
        
        console.log('📥 Starting to load players...');
        await loadPlayers();
        
        console.log('🎯 Attaching event listeners...');
        attachEventListeners();
        
        console.log('✅ Players page initialization complete!');
    } catch (error) {
        console.error('💥 FATAL ERROR in players.js initialization:', error);
        alert('Error loading players page. Check console for details.');
    }
});

// Check authentication
async function checkAuth() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('❌ Auth error:', error);
            return false;
        }
        
        if (!session) {
            console.error('❌ No active session');
            return false;
        }
        
        console.log('✅ User authenticated:', session.user.email);
        return true;
        
    } catch (error) {
        console.error('❌ Auth check error:', error);
        return false;
    }
}

// ===================================
// LOAD PLAYERS FROM DATABASE
// ===================================

async function loadPlayers() {
    try {
        console.log('📥 Loading players AND prospects from database...');
        
        const { data: playersData, error: playersError } = await supabase
            .from('players')
            .select(`
                *,
                contracts:current_contract_id (
                    id,
                    contract_end_date,
                    teams:team_id (
                        name
                    )
                )
            `)
            .order('created_at', { ascending: false });
        
        if (playersError) {
            console.error('❌ Players error:', playersError);
            throw playersError;
        }
        
        const { data: prospectsData, error: prospectsError } = await supabase
            .from('prospects')
            .select('*')
            .eq('is_converted', false)
            .order('created_at', { ascending: false });
        
        if (prospectsError) {
            console.error('❌ Prospects error:', prospectsError);
            throw prospectsError;
        }
        
        console.log('✅ Players loaded:', playersData?.length || 0);
        console.log('✅ Prospects loaded:', prospectsData?.length || 0);
        
        allPlayers = [
            ...(playersData || []).map(p => ({ ...p, _type: 'player' })),
            ...(prospectsData || []).map(p => ({ ...p, _type: 'prospect' }))
        ];
        
        filteredPlayers = allPlayers;
        
        updateTabCounts();
        renderPlayers();
        
    } catch (error) {
        console.error('❌ Error loading data:', error);
        showError('Failed to load players. Please refresh the page.');
    }
}

// ===================================
// RENDER PLAYERS TABLE
// ===================================

function renderPlayers() {
    console.log('🎨 renderPlayers() called');
    console.log('📊 Filtered players:', filteredPlayers.length);
    console.log('📑 Current tab:', currentTab);
    
    const tbody = document.getElementById('players-table-body');
    const emptyState = document.getElementById('empty-state');
    const table = document.querySelector('.players-table');
    
    console.log('🔍 DOM elements found:', {
        tbody: !!tbody,
        emptyState: !!emptyState,
        table: !!table
    });
    
    let playersToShow = filteredPlayers;
    
    if (currentTab === 'prospects') {
        playersToShow = filteredPlayers.filter(p => p._type === 'prospect');
    } else if (currentTab === 'under-management') {
        playersToShow = filteredPlayers.filter(p => p._type === 'player');
    }
    
    console.log('👥 Players to show:', playersToShow.length);
    
    if (playersToShow.length === 0) {
        console.log('📭 Showing empty state');
        
        if (table) {
            table.style.display = 'none';
            console.log('✅ Table hidden');
        }
        
        if (emptyState) {
            emptyState.style.display = 'flex';
            emptyState.style.visibility = 'visible';
            emptyState.style.opacity = '1';
            console.log('✅ Empty state display set to FLEX');
        } else {
            console.error('❌ Empty state element NOT FOUND in DOM!');
        }
        return;
    }
    
    console.log('📋 Showing table with', playersToShow.length, 'items');
    if (table) table.style.display = 'table';
    if (emptyState) emptyState.style.display = 'none';
    
    const html = playersToShow.map(item => {
        if (item._type === 'prospect') {
            const age = calculateAge(item.date_of_birth);
            return `
                <tr onclick="showPlayerDetail('${item.id}', 'prospect')">
                    <td class="player-name-cell">${item.first_name} ${item.last_name}</td>
                    <td>${item.position || '-'}</td>
                    <td>${age || '-'}</td>
                    <td><span class="status-badge prospect">Prospect</span></td>
                    <td>-</td>
                    <td>${item.email || '-'}</td>
                </tr>
            `;
        } else {
            const age = calculateAge(item.date_of_birth);
            const statusClass = item.player_deal_status;
            const statusText = formatStatus(item.player_deal_status);
            const teamName = item.contracts?.teams?.name || '-';
            
            return `
                <tr onclick="showPlayerDetail('${item.id}', 'player')">
                    <td class="player-name-cell">${item.first_name} ${item.last_name}</td>
                    <td>${item.position || '-'}</td>
                    <td>${age || '-'}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td>${teamName}</td>
                    <td>${item.email || '-'}</td>
                </tr>
            `;
        }
    }).join('');
    
    tbody.innerHTML = html;
    console.log('✅ Table HTML inserted, rows:', tbody.children.length);
}

// ===================================
// TAB SWITCHING
// ===================================

function updateTabCounts() {
    const prospectsCount = allPlayers.filter(p => p._type === 'prospect').length;
    const playersCount = allPlayers.filter(p => p._type === 'player').length;
    
    document.getElementById('prospects-count').textContent = prospectsCount;
    document.getElementById('management-count').textContent = playersCount;
}

// ===================================
// PLAYER DETAIL VIEW
// ===================================

function showPlayerDetail(playerId, type) {
    currentPlayer = allPlayers.find(p => p.id === playerId);
    
    if (!currentPlayer) {
        console.error('Player/Prospect not found:', playerId);
        return;
    }
    
    console.log('📋 Showing detail:', currentPlayer);
    
    document.getElementById('players-list-view').style.display = 'none';
    document.getElementById('player-detail-view').style.display = 'block';
    
    const initials = `${currentPlayer.first_name[0]}${currentPlayer.last_name[0]}`;
    document.getElementById('player-avatar-text').textContent = initials;
    document.getElementById('player-name-detail').textContent = 
        `${currentPlayer.first_name} ${currentPlayer.last_name}`;
    
    if (type === 'prospect') {
        // PROSPECT VIEW
        document.getElementById('player-position-detail').textContent = 
            currentPlayer.position || 'N/A';
        
        const age = calculateAge(currentPlayer.date_of_birth);
        document.getElementById('player-age-detail').textContent = 
            age ? `${age} years` : 'N/A';
        
        const statusBadge = document.getElementById('player-status-badge');
        statusBadge.textContent = 'Prospect';
        statusBadge.className = 'status-badge prospect';
        
        document.querySelector('.player-header-actions').innerHTML = `
            <button onclick="convertToPlayer('${currentPlayer.id}')" class="btn-primary">
                🔄 Convert to Under Management
            </button>
            <button id="btn-edit-prospect" class="btn-secondary">Edit</button>
            <button id="btn-delete-prospect" class="btn-danger">Delete</button>
        `;
        
        document.querySelector('.detail-grid').innerHTML = `
            <div class="detail-card">
                <h3>Personal Information</h3>
                <div class="detail-row">
                    <span class="detail-label">Full Name</span>
                    <span class="detail-value">${currentPlayer.first_name} ${currentPlayer.last_name}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Date of Birth</span>
                    <span class="detail-value">${formatDate(currentPlayer.date_of_birth) || 'Not provided'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Position</span>
                    <span class="detail-value">${currentPlayer.position || 'Not specified'}</span>
                </div>
            </div>

            <div class="detail-card">
                <h3>Contact Information</h3>
                <div class="detail-row">
                    <span class="detail-label">Email</span>
                    <span class="detail-value">${currentPlayer.email || 'Not provided'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Phone</span>
                    <span class="detail-value">${currentPlayer.phone || 'Not provided'}</span>
                </div>
            </div>

            <div class="detail-card">
                <h3>Status</h3>
                <div class="detail-row">
                    <span class="detail-label">Type</span>
                    <span class="detail-value"><span class="status-badge prospect">Prospect</span></span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Added On</span>
                    <span class="detail-value">${formatDate(currentPlayer.created_at)}</span>
                </div>
            </div>

            <div class="detail-card" style="grid-column: 1 / -1;">
                <h3>Notes</h3>
                <div class="notes-section">
                    <textarea id="prospect-notes" class="notes-textarea" rows="8" placeholder="Add notes about this prospect...">${currentPlayer.notes || ''}</textarea>
                    <button onclick="saveProspectNotes('${currentPlayer.id}')" class="btn-primary" style="margin-top: 12px;">💾 Save Notes</button>
                </div>
            </div>
        `;
        
        setTimeout(() => {
            document.getElementById('btn-edit-prospect')?.addEventListener('click', () => {
                openEditProspectModal(currentPlayer);
            });
            
            document.getElementById('btn-delete-prospect')?.addEventListener('click', () => {
                deleteProspect(currentPlayer.id);
            });
        }, 100);
        
    } else {
        // PLAYER VIEW
        document.getElementById('player-position-detail').textContent = 
            currentPlayer.position || 'N/A';
        
        const age = calculateAge(currentPlayer.date_of_birth);
        document.getElementById('player-age-detail').textContent = 
            age ? `${age} years` : 'N/A';
        
        const statusBadge = document.getElementById('player-status-badge');
        statusBadge.textContent = formatStatus(currentPlayer.player_deal_status);
        statusBadge.className = `status-badge ${currentPlayer.player_deal_status}`;
        
        document.querySelector('.player-header-actions').innerHTML = `
            <button id="btn-edit-player" class="btn-secondary">Edit</button>
            <button id="btn-delete-player" class="btn-danger">Delete</button>
        `;
        
        // Render player cards with contract section AND contract history
        document.querySelector('.detail-grid').innerHTML = `
            <div class="detail-card">
                <h3>Personal Information</h3>
                <div class="detail-row">
                    <span class="detail-label">Full Name</span>
                    <span class="detail-value">${currentPlayer.first_name} ${currentPlayer.last_name}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Date of Birth</span>
                    <span class="detail-value">${formatDate(currentPlayer.date_of_birth) || 'Not provided'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Position</span>
                    <span class="detail-value">${currentPlayer.position || 'Not specified'}</span>
                </div>
            </div>

            <div class="detail-card">
                <h3>Contact Information</h3>
                <div class="detail-row">
                    <span class="detail-label">Email</span>
                    <span class="detail-value">${currentPlayer.email || 'Not provided'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Phone</span>
                    <span class="detail-value">${currentPlayer.phone || 'Not provided'}</span>
                </div>
            </div>

            <div class="detail-card">
                <h3>Current Status</h3>
                <div class="detail-row">
                    <span class="detail-label">Player Status</span>
                    <span class="detail-value">${formatStatus(currentPlayer.player_deal_status)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Current Team</span>
                    <span class="detail-value" id="detail-current-team">-</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Contract Expiry</span>
                    <span class="detail-value" id="detail-contract-expiry">-</span>
                </div>
            </div>

            <div class="detail-card" id="contract-card" style="grid-column: 1 / -1;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0;">Current Contract</h3>
                    <div style="display: flex; gap: 12px;">
                        <button id="btn-view-contract-history" class="btn-secondary">📜 Contract History</button>
                        <button id="btn-open-contract-modal" class="btn-primary">+ Add/Edit Contract</button>
                    </div>
                </div>
                <div id="contract-details-content">
                    <p style="color: var(--gray-600); text-align: center; padding: 20px;">No active contract</p>
                </div>
            </div>

            <div class="detail-card" id="contract-history-card" style="grid-column: 1 / -1; display: none;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0;">Contract History</h3>
                    <button id="btn-close-contract-history" class="btn-secondary">✕ Close</button>
                </div>
                <div id="contract-history-content">
                    <p style="color: var(--gray-600); text-align: center; padding: 20px;">No historical contracts</p>
                </div>
            </div>
        `;
        
        // Load contracts (both active and historical)
        loadPlayerContracts(currentPlayer.id);
        
        setTimeout(() => {
            document.getElementById('btn-edit-player')?.addEventListener('click', () => {
                openEditModal(currentPlayer);
            });
            
            document.getElementById('btn-delete-player')?.addEventListener('click', () => {
                deletePlayer(currentPlayer.id);
            });
        }, 100);
    }
}

function hidePlayerDetail() {
    document.getElementById('players-list-view').style.display = 'block';
    document.getElementById('player-detail-view').style.display = 'none';
    currentPlayer = null;
}

// ===================================
// ADD PLAYER
// ===================================

async function addPlayer(type, formData) {
    try {
        console.log('➕ Adding new:', type, formData);
        
        let data, error;
        
        if (type === 'prospect') {
            const prospectData = {
                first_name: formData.first_name,
                last_name: formData.last_name,
                email: formData.email,
                phone: formData.phone,
                notes: formData.notes
            };
            
            const result = await supabase
                .from('prospects')
                .insert([prospectData])
                .select()
                .single();
            
            data = result.data;
            error = result.error;
            
        } else {
            const playerData = {
                first_name: formData.first_name,
                last_name: formData.last_name,
                date_of_birth: formData.date_of_birth || null,
                position: formData.position || null,
                email: formData.email || null,
                phone: formData.phone || null,
                player_deal_status: 'free_agent'
            };
            
            const result = await supabase
                .from('players')
                .insert([playerData])
                .select()
                .single();
            
            data = result.data;
            error = result.error;
            
            // Auto-generate contact for new player
            if (data && !error) {
                await createPlayerContact(data.id, data);
            }
        }
        
        if (error) {
            console.error('❌ Database error:', error);
            throw error;
        }
        
        console.log('✅ Added successfully:', data);
        
        await loadPlayers();
        closeAddModal();
        
        showSuccess(`${type === 'prospect' ? 'Prospect' : 'Player'} added successfully!`);
        
        if (type === 'player') {
            setTimeout(() => {
                alert('ℹ️ Player added successfully!\n\nYou can add contract details from the player\'s profile page.');
            }, 500);
        }
        
    } catch (error) {
        console.error('❌ Error adding:', error);
        showError('Failed to add. Please try again.');
    }
}

// ===================================
// EDIT PLAYER WITH AUTO-CONTACT GENERATION
// ===================================

async function updatePlayer(playerId, formData) {
    try {
        console.log('✏️ Updating player:', playerId, formData);
        
        const { data, error } = await supabase
            .from('players')
            .update(formData)
            .eq('id', playerId)
            .select()
            .single();
        
        if (error) {
            console.error('❌ Database error:', error);
            throw error;
        }
        
        console.log('✅ Player updated successfully:', data);
        
        // Auto-generate or update contact for this player
        await updatePlayerContact(playerId, data);
        
        await loadPlayers();
        
        if (currentPlayer && currentPlayer.id === playerId) {
            showPlayerDetail(playerId, 'player');
        }
        
        closeEditModal();
        showSuccess('Player updated successfully!');
        
    } catch (error) {
        console.error('❌ Error updating player:', error);
        showError('Failed to update player. Please try again.');
    }
}

// ===================================
// AUTO-GENERATE/UPDATE PLAYER CONTACT
// ===================================

async function createPlayerContact(playerId, playerData) {
    try {
        console.log('📇 Creating contact for new player:', playerId);
        
        // Get team_id from current contract if exists
        let teamId = null;
        if (playerData.current_contract_id) {
            const { data: contractData } = await supabase
                .from('contracts')
                .select('team_id')
                .eq('id', playerData.current_contract_id)
                .single();
            
            if (contractData) {
                teamId = contractData.team_id;
            }
        }
        
        const contactData = {
            name: `${playerData.first_name} ${playerData.last_name}`,
            role: playerData.position || 'Player',
            email: playerData.email || null,
            phone: playerData.phone || null,
            player_id: playerId,
            team_id: teamId
        };
        
        const { error } = await supabase
            .from('contacts')
            .insert([contactData]);
        
        if (error) {
            console.error('Error creating contact:', error);
        } else {
            console.log('✅ Contact created successfully with team:', teamId);
        }
    } catch (error) {
        console.error('❌ Error creating player contact:', error);
    }
}

async function updatePlayerContact(playerId, playerData) {
    try {
        console.log('📇 Auto-updating contact for player:', playerId);
        
        // Check if contact already exists for this player
        const { data: existingContact, error: checkError } = await supabase
            .from('contacts')
            .select('id')
            .eq('player_id', playerId)
            .single();
        
        if (checkError && checkError.code !== 'PGRST116') {
            console.error('Error checking existing contact:', checkError);
            return;
        }
        
        // Get team_id from current contract if exists
        let teamId = null;
        if (playerData.current_contract_id) {
            const { data: contractData } = await supabase
                .from('contracts')
                .select('team_id')
                .eq('id', playerData.current_contract_id)
                .single();
            
            if (contractData) {
                teamId = contractData.team_id;
            }
        }
        
        const contactData = {
            name: `${playerData.first_name} ${playerData.last_name}`,
            role: playerData.position || 'Player',
            email: playerData.email || null,
            phone: playerData.phone || null,
            player_id: playerId,
            team_id: teamId
        };
        
        if (existingContact) {
            // Update existing contact
            const { error: updateError } = await supabase
                .from('contacts')
                .update(contactData)
                .eq('id', existingContact.id);
            
            if (updateError) {
                console.error('Error updating contact:', updateError);
            } else {
                console.log('✅ Contact updated successfully with team:', teamId);
            }
        } else {
            // Create new contact if doesn't exist
            const { error: insertError } = await supabase
                .from('contacts')
                .insert([contactData]);
            
            if (insertError) {
                console.error('Error creating contact:', insertError);
            } else {
                console.log('✅ Contact created successfully with team:', teamId);
            }
        }
    } catch (error) {
        console.error('❌ Error managing player contact:', error);
        // Don't throw - this is a non-critical operation
    }
}

// ===================================
// DELETE PLAYER
// ===================================

async function deletePlayer(playerId) {
    if (!confirm('Are you sure you want to delete this player? This action cannot be undone.')) {
        return;
    }
    
    try {
        console.log('🗑️ Deleting player:', playerId);
        
        const { error } = await supabase
            .from('players')
            .delete()
            .eq('id', playerId);
        
        if (error) {
            console.error('❌ Database error:', error);
            throw error;
        }
        
        console.log('✅ Player deleted successfully');
        
        await loadPlayers();
        hidePlayerDetail();
        
        showSuccess('Player deleted successfully');
        
    } catch (error) {
        console.error('❌ Error deleting player:', error);
        showError('Failed to delete player. Please try again.');
    }
}

// ===================================
// SEARCH & FILTER
// ===================================

function applyFilters() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const positionFilter = document.getElementById('filter-position').value;
    const statusFilter = document.getElementById('filter-status').value;
    
    filteredPlayers = allPlayers.filter(player => {
        const matchesSearch = !searchTerm || 
            player.first_name.toLowerCase().includes(searchTerm) ||
            player.last_name.toLowerCase().includes(searchTerm) ||
            (player.email && player.email.toLowerCase().includes(searchTerm));
        
        const matchesPosition = !positionFilter || player.position === positionFilter;
        const matchesStatus = !statusFilter || player.player_deal_status === statusFilter;
        
        return matchesSearch && matchesPosition && matchesStatus;
    });
    
    renderPlayers();
}

// ===================================
// EVENT LISTENERS
// ===================================

function attachEventListeners() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTab = btn.dataset.tab;
            renderPlayers();
        });
    });
    
    document.getElementById('search-input').addEventListener('input', applyFilters);
    document.getElementById('filter-position').addEventListener('change', applyFilters);
    document.getElementById('filter-status').addEventListener('change', applyFilters);
    
    document.getElementById('btn-add-player').addEventListener('click', () => {
        console.log('➕ Add Player button clicked');
        openAddModal();
    });
    
    // NOTE: Contract button listeners are now attached in attachContractButtonListeners()
    // called from loadPlayerContracts() after buttons are created
    
    document.getElementById('add-player-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const type = document.getElementById('player_type').value;
        
        if (!type) {
            alert('Please select a type (Prospect or Under Management)');
            return;
        }
        
        const formData = {
            first_name: document.getElementById('first_name').value.trim(),
            last_name: document.getElementById('last_name').value.trim(),
            email: document.getElementById('email').value.trim() || null,
            phone: document.getElementById('phone').value.trim() || null
        };
        
        if (type === 'player') {
            formData.date_of_birth = document.getElementById('date_of_birth').value || null;
            formData.position = document.getElementById('position').value || null;
        } else {
            formData.notes = document.getElementById('notes').value.trim() || null;
        }
        
        await addPlayer(type, formData);
    });
    
    document.getElementById('edit-player-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const modal = document.getElementById('edit-player-modal');
        const isProspect = modal.dataset.type === 'prospect';
        const id = document.getElementById('edit_player_id').value;
        
        const formData = {
            first_name: document.getElementById('edit_first_name').value.trim(),
            last_name: document.getElementById('edit_last_name').value.trim(),
            date_of_birth: document.getElementById('edit_date_of_birth').value || null,
            position: document.getElementById('edit_position').value || null,
            email: document.getElementById('edit_email').value.trim() || null,
            phone: document.getElementById('edit_phone').value.trim() || null
        };
        
        if (isProspect) {
            await updateProspect(id, formData);
        } else {
            await updatePlayer(id, formData);
        }
        
        modal.dataset.type = '';
        document.querySelector('#edit-player-modal .modal-header h2').textContent = 'Edit Player';
    });
    
    document.getElementById('close-add-modal').addEventListener('click', closeAddModal);
    document.getElementById('cancel-add').addEventListener('click', closeAddModal);
    
    document.getElementById('close-edit-modal').addEventListener('click', closeEditModal);
    document.getElementById('cancel-edit').addEventListener('click', closeEditModal);
    
    document.getElementById('btn-back-to-list').addEventListener('click', hidePlayerDetail);
    
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

// ===================================
// MODAL FUNCTIONS
// ===================================

function openAddModal() {
    console.log('🎭 Opening Add Player modal');
    document.getElementById('add-player-form').reset();
    
    document.querySelectorAll('.player-only-field').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.prospect-only-field').forEach(el => el.style.display = 'none');
    
    const modal = document.getElementById('add-player-modal');
    modal.style.display = 'flex';
    console.log('✅ Modal display set to flex');
}

document.addEventListener('DOMContentLoaded', () => {
    const playerTypeSelect = document.getElementById('player_type');
    
    if (playerTypeSelect) {
        playerTypeSelect.addEventListener('change', (e) => {
            const type = e.target.value;
            const playerOnlyFields = document.querySelectorAll('.player-only-field');
            const prospectOnlyFields = document.querySelectorAll('.prospect-only-field');
            
            if (type === 'player') {
                playerOnlyFields.forEach(el => el.style.display = 'flex');
                prospectOnlyFields.forEach(el => el.style.display = 'none');
            } else if (type === 'prospect') {
                playerOnlyFields.forEach(el => el.style.display = 'none');
                prospectOnlyFields.forEach(el => el.style.display = 'flex');
            } else {
                playerOnlyFields.forEach(el => el.style.display = 'none');
                prospectOnlyFields.forEach(el => el.style.display = 'none');
            }
        });
    }
});

function closeAddModal() {
    document.getElementById('add-player-modal').style.display = 'none';
}

function openEditModal(player) {
    document.getElementById('edit_player_id').value = player.id;
    document.getElementById('edit_first_name').value = player.first_name;
    document.getElementById('edit_last_name').value = player.last_name;
    document.getElementById('edit_date_of_birth').value = player.date_of_birth || '';
    document.getElementById('edit_position').value = player.position || '';
    document.getElementById('edit_email').value = player.email || '';
    document.getElementById('edit_phone').value = player.phone || '';
    
    document.getElementById('edit-player-modal').style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('edit-player-modal').style.display = 'none';
}

// ===================================
// PROSPECT NOTES
// ===================================

async function saveProspectNotes(prospectId) {
    try {
        const notes = document.getElementById('prospect-notes').value;
        
        console.log('💾 Saving prospect notes:', prospectId, notes);
        
        const { data, error } = await supabase
            .from('prospects')
            .update({ notes: notes })
            .eq('id', prospectId)
            .select()
            .single();
        
        if (error) throw error;
        
        console.log('✅ Notes saved:', data);
        
        const prospect = allPlayers.find(p => p.id === prospectId);
        if (prospect) {
            prospect.notes = notes;
        }
        
        showSuccess('Notes saved successfully!');
        
    } catch (error) {
        console.error('❌ Error saving notes:', error);
        showError('Failed to save notes. Please try again.');
    }
}

// ===================================
// CONVERT PROSPECT TO PLAYER
// ===================================

async function convertToPlayer(prospectId) {
    const prospect = allPlayers.find(p => p.id === prospectId && p._type === 'prospect');
    
    if (!prospect) {
        console.error('Prospect not found:', prospectId);
        return;
    }
    
    const confirmed = confirm(
        `Convert "${prospect.first_name} ${prospect.last_name}" to Under Management?\n\n` +
        `This will:\n` +
        `✅ Move the prospect to your player roster\n` +
        `✅ Transfer all basic information\n` +
        `✅ Keep contact details and notes\n\n` +
        `You can add contract details after conversion.`
    );
    
    if (!confirmed) return;
    
    try {
        console.log('🔄 Converting prospect to player:', prospect);
        
        const playerData = {
            first_name: prospect.first_name,
            last_name: prospect.last_name,
            date_of_birth: prospect.date_of_birth || null,
            position: prospect.position || null,
            email: prospect.email || null,
            phone: prospect.phone || null,
            player_deal_status: 'free_agent'
        };
        
        const { data: newPlayer, error: playerError } = await supabase
            .from('players')
            .insert([playerData])
            .select()
            .single();
        
        if (playerError) throw playerError;
        
        console.log('✅ Player created:', newPlayer);
        
        // Auto-generate contact for the converted player
        await createPlayerContact(newPlayer.id, newPlayer);
        
        const { error: updateError } = await supabase
            .from('prospects')
            .update({
                is_converted: true,
                converted_to_player_id: newPlayer.id
            })
            .eq('id', prospectId);
        
        if (updateError) throw updateError;
        
        console.log('✅ Prospect marked as converted');
        
        await loadPlayers();
        
        showSuccess(
            `✅ ${prospect.first_name} ${prospect.last_name} converted successfully!\n\n` +
            `You can now add contract details from the player's profile.`
        );
        
        hidePlayerDetail();
        
        setTimeout(() => {
            showPlayerDetail(newPlayer.id, 'player');
        }, 500);
        
    } catch (error) {
        console.error('❌ Error converting prospect:', error);
        showError('Failed to convert prospect. Please try again.');
    }
}

// ===================================
// PROSPECT EDIT & DELETE
// ===================================

function openEditProspectModal(prospect) {
    document.getElementById('edit_player_id').value = prospect.id;
    document.getElementById('edit_first_name').value = prospect.first_name;
    document.getElementById('edit_last_name').value = prospect.last_name;
    document.getElementById('edit_date_of_birth').value = prospect.date_of_birth || '';
    document.getElementById('edit_position').value = prospect.position || '';
    document.getElementById('edit_email').value = prospect.email || '';
    document.getElementById('edit_phone').value = prospect.phone || '';
    
    document.querySelector('#edit-player-modal .modal-header h2').textContent = 'Edit Prospect';
    document.getElementById('edit-player-modal').dataset.type = 'prospect';
    
    document.getElementById('edit-player-modal').style.display = 'flex';
}

async function updateProspect(prospectId, formData) {
    try {
        console.log('✏️ Updating prospect:', prospectId, formData);
        
        const { data, error } = await supabase
            .from('prospects')
            .update(formData)
            .eq('id', prospectId)
            .select()
            .single();
        
        if (error) throw error;
        
        console.log('✅ Prospect updated:', data);
        
        await loadPlayers();
        showPlayerDetail(prospectId, 'prospect');
        
        showSuccess('Prospect updated successfully!');
        
    } catch (error) {
        console.error('❌ Error updating prospect:', error);
        showError('Failed to update prospect. Please try again.');
    }
}

async function deleteProspect(prospectId) {
    if (!confirm('Are you sure you want to delete this prospect? This action cannot be undone.')) {
        return;
    }
    
    try {
        console.log('🗑️ Deleting prospect:', prospectId);
        
        const { error } = await supabase
            .from('prospects')
            .delete()
            .eq('id', prospectId);
        
        if (error) throw error;
        
        console.log('✅ Prospect deleted');
        
        await loadPlayers();
        hidePlayerDetail();
        
        showSuccess('Prospect deleted successfully');
        
    } catch (error) {
        console.error('❌ Error deleting prospect:', error);
        showError('Failed to delete prospect. Please try again.');
    }
}

// ===================================
// CONTRACT MANAGEMENT WITH HISTORY
// ===================================

async function loadPlayerContracts(playerId) {
    try {
        console.log('📄 Loading contracts for player:', playerId);
        
        // Load active contract
        const { data: activeContract, error: activeError } = await supabase
            .from('contracts')
            .select(`
                *,
                teams:team_id (
                    name,
                    city
                ),
                competitions:competition_id (
                    name
                )
            `)
            .eq('player_id', playerId)
            .eq('is_active', true)
            .single();
        
        if (activeError && activeError.code !== 'PGRST116') {
            throw activeError;
        }
        
        // Load historical contracts (inactive)
        const { data: historicalContracts, error: histError } = await supabase
            .from('contracts')
            .select(`
                *,
                teams:team_id (
                    name,
                    city
                ),
                competitions:competition_id (
                    name
                )
            `)
            .eq('player_id', playerId)
            .eq('is_active', false)
            .order('contract_end_date', { ascending: false });
        
        if (histError) {
            throw histError;
        }
        
        console.log('✅ Active contract:', activeContract);
        console.log('📚 Historical contracts:', historicalContracts?.length || 0);
        
        if (activeContract) {
            displayContractDetails(activeContract);
        }
        
        if (historicalContracts && historicalContracts.length > 0) {
            displayContractHistory(historicalContracts);
        }
        
        // Attach event listeners for contract buttons AFTER they're created
        attachContractButtonListeners();
        
    } catch (error) {
        console.error('❌ Error loading contracts:', error);
    }
}

// ===================================
// CONTRACT BUTTON EVENT LISTENERS
// ===================================

function attachContractButtonListeners() {
    console.log('🔗 Attaching contract button listeners...');
    
    // Contract History Toggle Button
    const historyBtn = document.getElementById('btn-view-contract-history');
    if (historyBtn) {
        historyBtn.removeEventListener('click', handleContractHistoryClick); // Remove old listener
        historyBtn.addEventListener('click', handleContractHistoryClick);
        console.log('✅ Contract history button listener attached');
    }
    
    // Close Contract History Button  
    const closeHistoryBtn = document.getElementById('btn-close-contract-history');
    if (closeHistoryBtn) {
        closeHistoryBtn.removeEventListener('click', handleCloseHistoryClick);
        closeHistoryBtn.addEventListener('click', handleCloseHistoryClick);
        console.log('✅ Close history button listener attached');
    }
    
    // Open Contract Modal Button
    const contractModalBtn = document.getElementById('btn-open-contract-modal');
    if (contractModalBtn) {
        contractModalBtn.removeEventListener('click', handleOpenContractModal);
        contractModalBtn.addEventListener('click', handleOpenContractModal);
        console.log('✅ Contract modal button listener attached');
    }
}

// Event handler functions
async function handleContractHistoryClick() {
    console.log('📜 Contract history button clicked!');
    if (currentPlayer && currentPlayer.id) {
        const historyCard = document.getElementById('contract-history-card');
        const historyContent = document.getElementById('contract-history-content');
        
        historyCard.style.display = 'block';
        historyContent.innerHTML = '<p style="color: var(--gray-600); text-align: center; padding: 20px;">Loading...</p>';
        
        try {
            const { data: historicalContracts, error } = await supabase
                .from('contracts')
                .select(`
                    *,
                    teams:team_id (name, city),
                    competitions:competition_id (name)
                `)
                .eq('player_id', currentPlayer.id)
                .eq('is_active', false)
                .order('contract_end_date', { ascending: false });
            
            if (error) throw error;
            
            if (historicalContracts && historicalContracts.length > 0) {
                displayContractHistory(historicalContracts);
            } else {
                historyContent.innerHTML = '<p style="color: var(--gray-600); text-align: center; padding: 20px;">No historical contracts found</p>';
            }
        } catch (error) {
            console.error('Error loading contract history:', error);
            historyContent.innerHTML = '<p style="color: var(--error-red); text-align: center; padding: 20px;">Error loading history</p>';
        }
    }
}

function handleCloseHistoryClick() {
    console.log('✕ Close history button clicked!');
    document.getElementById('contract-history-card').style.display = 'none';
}

function handleOpenContractModal() {
    console.log('➕ Open contract modal button clicked!');
    if (currentPlayer && currentPlayer.id) {
        openContractManager(currentPlayer.id);
    } else {
        console.error('❌ No current player selected');
    }
}

function displayContractDetails(contract) {
    const teamName = contract.teams?.name || 'Unknown Team';
    const teamCity = contract.teams?.city || '';
    const competition = contract.competitions?.name || 'N/A';
    
    // Update status card
    document.getElementById('detail-current-team').textContent = teamName;
    document.getElementById('detail-contract-expiry').textContent = 
        formatDate(contract.contract_end_date);
    
    // Update contract card
    const contractContent = document.getElementById('contract-details-content');
    contractContent.innerHTML = `
        <div class="contract-info-grid">
            <div class="detail-row">
                <span class="detail-label">Team</span>
                <span class="detail-value">${teamName}${teamCity ? ` (${teamCity})` : ''}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Competition</span>
                <span class="detail-value">${competition}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Contract Value</span>
                <span class="detail-value">€${formatNumber(contract.contract_value)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Commission %</span>
                <span class="detail-value">${contract.commission_percentage}%</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Commission Amount</span>
                <span class="detail-value">€${formatNumber(contract.commission_amount)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Start Date</span>
                <span class="detail-value">${formatDate(contract.contract_start_date)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">End Date</span>
                <span class="detail-value">${formatDate(contract.contract_end_date)}</span>
            </div>
            ${contract.notes ? `
            <div class="detail-row" style="grid-column: 1 / -1;">
                <span class="detail-label">Notes</span>
                <span class="detail-value">${contract.notes}</span>
            </div>
            ` : ''}
        </div>
    `;
}

function displayContractHistory(contracts) {
    console.log('📚 Displaying contract history:', contracts.length, 'contracts');
    
    const historyCard = document.getElementById('contract-history-card');
    const historyContent = document.getElementById('contract-history-content');
    
    if (!historyCard || !historyContent) {
        console.error('❌ Contract history elements not found in DOM');
        return;
    }
    
    // Show the history card
    historyCard.style.display = 'block';
    
    // Build HTML for each historical contract
    const historyHTML = contracts.map(contract => {
        const teamName = contract.teams?.name || 'Unknown Team';
        const teamCity = contract.teams?.city || '';
        const competition = contract.competitions?.name || 'N/A';
        const isRetroactive = contract.added_retroactively ? 
            '<span style="color: var(--accent-orange); font-size: 12px; margin-left: 8px;">📋 Added Retroactively</span>' : '';
        
        return `
            <div class="history-contract-item" style="
                background: var(--gray-50); 
                border: 1px solid var(--gray-200); 
                border-radius: 8px; 
                padding: 16px; 
                margin-bottom: 12px;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <h4 style="margin: 0; color: var(--gray-900);">
                        ${teamName}${teamCity ? ` (${teamCity})` : ''}
                        ${isRetroactive}
                    </h4>
                    <span style="color: var(--gray-600); font-size: 14px;">
                        ${formatDate(contract.contract_start_date)} → ${formatDate(contract.contract_end_date)}
                    </span>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
                    <div class="detail-row" style="border: none; padding: 0;">
                        <span class="detail-label">Competition</span>
                        <span class="detail-value">${competition}</span>
                    </div>
                    <div class="detail-row" style="border: none; padding: 0;">
                        <span class="detail-label">Contract Value</span>
                        <span class="detail-value">€${formatNumber(contract.contract_value)}</span>
                    </div>
                    <div class="detail-row" style="border: none; padding: 0;">
                        <span class="detail-label">Commission</span>
                        <span class="detail-value">${contract.commission_percentage}% (€${formatNumber(contract.commission_amount)})</span>
                    </div>
                </div>
                ${contract.notes ? `
                <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--gray-200);">
                    <span class="detail-label">Notes:</span>
                    <p style="margin: 4px 0 0 0; color: var(--gray-700);">${contract.notes}</p>
                </div>
                ` : ''}
            </div>
        `;
    }).join('');
    
    historyContent.innerHTML = historyHTML;
}

function openContractModal(playerId) {
    if (window.openContractManager) {
        window.openContractManager(playerId);
    } else {
        console.error('Contract Manager not loaded!');
        alert('Error: Contract Manager module not loaded. Please refresh the page.');
    }
}

// ===================================
// UTILITY FUNCTIONS
// ===================================

function calculateAge(dateOfBirth) {
    if (!dateOfBirth) return null;
    
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
}

function formatDate(dateString) {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatStatus(status) {
    const statusMap = {
        'free_agent': 'Free Agent',
        'in_negotiation': 'In Negotiation',
        'signed': 'Signed'
    };
    
    return statusMap[status] || status;
}

function formatNumber(number) {
    if (!number) return '0.00';
    return new Intl.NumberFormat('it-IT', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(number);
}

function showSuccess(message) {
    alert('✅ ' + message);
}

function showError(message) {
    alert('❌ ' + message);
}