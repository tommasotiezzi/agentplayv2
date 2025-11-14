/* ===================================
   PLAYERS MODULE - FULL LOGIC
   =================================== */

let allPlayers = [];
let filteredPlayers = [];
let currentTab = 'under-management'; // Changed from 'prospects'
let currentPlayer = null;

// ===================================
// INITIALIZATION
// ===================================

document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🚀 Players.js - DOMContentLoaded fired');
        
        const authResult = await checkAuth();
        console.log('🔐 Auth check completed:', authResult);
        
        // Wait for sidebar component to be available
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
            // Continue anyway for debugging
            return false;
        }
        
        if (!session) {
            console.error('❌ No active session');
            // Continue anyway for debugging
            return false;
        }
        
        console.log('✅ User authenticated:', session.user.email);
        return true;
        
    } catch (error) {
        console.error('❌ Auth check error:', error);
        // Continue anyway for debugging
        return false;
    }
}

// ===================================
// LOAD PLAYERS FROM DATABASE
// ===================================

async function loadPlayers() {
    try {
        console.log('📥 Loading players AND prospects from database...');
        
        // Load actual players (under management)
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
        
        // Load prospects
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
        
        // Combine both with a type flag
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
    
    // Filter by current tab
    let playersToShow = filteredPlayers;
    
    if (currentTab === 'prospects') {
        playersToShow = filteredPlayers.filter(p => p._type === 'prospect');
    } else if (currentTab === 'under-management') {
        playersToShow = filteredPlayers.filter(p => p._type === 'player');
    }
    
    console.log('👥 Players to show:', playersToShow.length);
    
    // Show empty state if no players
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
    
    // Render rows
    const html = playersToShow.map(item => {
        if (item._type === 'prospect') {
            // Prospect row - simplified
            return `
                <tr onclick="showPlayerDetail('${item.id}', 'prospect')">
                    <td class="player-name-cell">${item.first_name} ${item.last_name}</td>
                    <td>-</td>
                    <td>-</td>
                    <td><span class="status-badge prospect">Prospect</span></td>
                    <td>-</td>
                    <td>${item.email || '-'}</td>
                </tr>
            `;
        } else {
            // Player row - full info
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

function showPlayerDetail(playerId) {
    currentPlayer = allPlayers.find(p => p.id === playerId);
    
    if (!currentPlayer) {
        console.error('Player not found:', playerId);
        return;
    }
    
    console.log('📋 Showing player detail:', currentPlayer);
    
    // Hide list view, show detail view
    document.getElementById('players-list-view').style.display = 'none';
    document.getElementById('player-detail-view').style.display = 'block';
    
    // Populate player details
    const initials = `${currentPlayer.first_name[0]}${currentPlayer.last_name[0]}`;
    document.getElementById('player-avatar-text').textContent = initials;
    document.getElementById('player-name-detail').textContent = 
        `${currentPlayer.first_name} ${currentPlayer.last_name}`;
    document.getElementById('player-position-detail').textContent = 
        currentPlayer.position || 'N/A';
    
    const age = calculateAge(currentPlayer.date_of_birth);
    document.getElementById('player-age-detail').textContent = 
        age ? `${age} years` : 'N/A';
    
    const statusBadge = document.getElementById('player-status-badge');
    statusBadge.textContent = formatStatus(currentPlayer.player_deal_status);
    statusBadge.className = `status-badge ${currentPlayer.player_deal_status}`;
    
    // Personal info
    document.getElementById('detail-full-name').textContent = 
        `${currentPlayer.first_name} ${currentPlayer.last_name}`;
    document.getElementById('detail-dob').textContent = 
        formatDate(currentPlayer.date_of_birth) || 'Not provided';
    document.getElementById('detail-position').textContent = 
        currentPlayer.position || 'Not specified';
    
    // Contact info
    document.getElementById('detail-email').textContent = 
        currentPlayer.email || 'Not provided';
    document.getElementById('detail-phone').textContent = 
        currentPlayer.phone || 'Not provided';
    
    // Current status
    document.getElementById('detail-status').textContent = 
        formatStatus(currentPlayer.player_deal_status);
    document.getElementById('detail-team').textContent = 
        currentPlayer.contracts?.teams?.name || 'Free Agent';
    document.getElementById('detail-contract-expiry').textContent = 
        currentPlayer.contracts?.contract_end_date 
            ? formatDate(currentPlayer.contracts.contract_end_date)
            : 'N/A';
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
            // Save to prospects table
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
            // Save to players table
            const playerData = {
                first_name: formData.first_name,
                last_name: formData.last_name,
                date_of_birth: formData.date_of_birth || null,
                position: formData.position || null,
                email: formData.email || null,
                phone: formData.phone || null,
                player_deal_status: 'free_agent' // Default status for new players
            };
            
            const result = await supabase
                .from('players')
                .insert([playerData])
                .select()
                .single();
            
            data = result.data;
            error = result.error;
        }
        
        if (error) {
            console.error('❌ Database error:', error);
            throw error;
        }
        
        console.log('✅ Added successfully:', data);
        
        // Reload data
        await loadPlayers();
        
        // Close modal
        closeAddModal();
        
        showSuccess(`${type === 'prospect' ? 'Prospect' : 'Player'} added successfully!`);
        
    } catch (error) {
        console.error('❌ Error adding:', error);
        showError('Failed to add. Please try again.');
    }
}

// ===================================
// EDIT PLAYER
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
        
        // Reload players
        await loadPlayers();
        
        // Update detail view if showing this player
        if (currentPlayer && currentPlayer.id === playerId) {
            showPlayerDetail(playerId);
        }
        
        // Close modal
        closeEditModal();
        
        showSuccess('Player updated successfully!');
        
    } catch (error) {
        console.error('❌ Error updating player:', error);
        showError('Failed to update player. Please try again.');
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
        
        // Reload players
        await loadPlayers();
        
        // Go back to list view
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
        // Search filter
        const matchesSearch = !searchTerm || 
            player.first_name.toLowerCase().includes(searchTerm) ||
            player.last_name.toLowerCase().includes(searchTerm) ||
            (player.email && player.email.toLowerCase().includes(searchTerm));
        
        // Position filter
        const matchesPosition = !positionFilter || player.position === positionFilter;
        
        // Status filter
        const matchesStatus = !statusFilter || player.player_deal_status === statusFilter;
        
        return matchesSearch && matchesPosition && matchesStatus;
    });
    
    renderPlayers();
}

// ===================================
// EVENT LISTENERS
// ===================================

function attachEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTab = btn.dataset.tab;
            renderPlayers();
        });
    });
    
    // Search
    document.getElementById('search-input').addEventListener('input', applyFilters);
    
    // Filters
    document.getElementById('filter-position').addEventListener('change', applyFilters);
    document.getElementById('filter-status').addEventListener('change', applyFilters);
    
    // Add player button
    document.getElementById('btn-add-player').addEventListener('click', () => {
        console.log('➕ Add Player button clicked');
        openAddModal();
    });
    
    // Add player form
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
    
    // Edit player form
    document.getElementById('edit-player-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const playerId = document.getElementById('edit_player_id').value;
        const formData = {
            first_name: document.getElementById('edit_first_name').value.trim(),
            last_name: document.getElementById('edit_last_name').value.trim(),
            date_of_birth: document.getElementById('edit_date_of_birth').value || null,
            position: document.getElementById('edit_position').value || null,
            email: document.getElementById('edit_email').value.trim() || null,
            phone: document.getElementById('edit_phone').value.trim() || null
        };
        
        await updatePlayer(playerId, formData);
    });
    
    // Modal controls
    document.getElementById('close-add-modal').addEventListener('click', closeAddModal);
    document.getElementById('cancel-add').addEventListener('click', closeAddModal);
    
    document.getElementById('close-edit-modal').addEventListener('click', closeEditModal);
    document.getElementById('cancel-edit').addEventListener('click', closeEditModal);
    
    // Back to list
    document.getElementById('btn-back-to-list').addEventListener('click', hidePlayerDetail);
    
    // Edit player button
    document.getElementById('btn-edit-player').addEventListener('click', () => {
        if (currentPlayer) {
            openEditModal(currentPlayer);
        }
    });
    
    // Delete player button
    document.getElementById('btn-delete-player').addEventListener('click', () => {
        if (currentPlayer) {
            deletePlayer(currentPlayer.id);
        }
    });
    
    // Close modal on outside click
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
    
    // Hide player-only and prospect-only fields initially
    document.querySelectorAll('.player-only-field').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.prospect-only-field').forEach(el => el.style.display = 'none');
    
    const modal = document.getElementById('add-player-modal');
    modal.style.display = 'flex';
    console.log('✅ Modal display set to flex');
}

// Add listener for player type change
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

function showSuccess(message) {
    // Simple alert for now - can be replaced with toast notification
    alert('✅ ' + message);
}

function showError(message) {
    // Simple alert for now - can be replaced with toast notification
    alert('❌ ' + message);
}