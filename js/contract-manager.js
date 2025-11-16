/* ===================================
   CONTRACT MANAGER MODULE
   Handles all contract-related operations including historical contracts
   =================================== */

class ContractManager {
    constructor() {
        this.currentPlayerId = null;
        this.currentContract = null;
        this.teams = [];
        this.competitions = [];
    }

    // ===================================
    // INITIALIZATION
    // ===================================

    async init(playerId) {
        console.log('📄 Initializing Contract Manager for player:', playerId);
        this.currentPlayerId = playerId;
        
        try {
            await this.loadTeamsAndCompetitions();
            await this.loadContract();
            this.renderModal();
            this.showModal();
            
        } catch (error) {
            console.error('❌ Error initializing contract manager:', error);
            alert('Error loading contract data. Please try again.');
        }
    }

    // ===================================
    // DATA LOADING
    // ===================================

    async loadTeamsAndCompetitions() {
        console.log('📥 Loading teams and competitions...');
        
        const { data: competitionsData, error: compError } = await supabase
            .from('competitions')
            .select('*')
            .order('name');
        
        if (compError) throw compError;
        
        this.competitions = competitionsData || [];
        console.log('✅ Competitions loaded:', this.competitions.length);
        
        const { data: teamsData, error: teamsError } = await supabase
            .from('teams')
            .select(`
                *,
                competitions:competition_id (
                    name
                )
            `)
            .order('name');
        
        if (teamsError) throw teamsError;
        
        this.teams = teamsData || [];
        console.log('✅ Teams loaded:', this.teams.length);
    }

    async loadContract() {
        console.log('📄 Loading existing contract...');
        
        const { data, error } = await supabase
            .from('contracts')
            .select(`
                *,
                teams:team_id (
                    id,
                    name,
                    city
                ),
                competitions:competition_id (
                    id,
                    name
                )
            `)
            .eq('player_id', this.currentPlayerId)
            .eq('is_active', true)
            .maybeSingle();
        
        if (error && error.code !== 'PGRST116') {
            throw error;
        }
        
        this.currentContract = data;
        
        if (data) {
            console.log('✅ Existing contract loaded:', data);
        } else {
            console.log('ℹ️ No existing contract found');
        }
    }

    // ===================================
    // MODAL RENDERING
    // ===================================

    renderModal() {
        console.log('🎨 Rendering contract modal...');
        
        let modal = document.getElementById('contract-modal');
        
        if (!modal) {
            const modalHTML = this.getModalHTML();
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            modal = document.getElementById('contract-modal');
        }
        
        if (this.currentContract) {
            this.populateForm();
        }
        else if (window.currentSignedDeal) {
            this.populateFromDeal(window.currentSignedDeal);
        }
        
        this.attachEventListeners();
    }

    populateFromDeal(dealInfo) {
        console.log('📋 Pre-populating from signed deal:', dealInfo);
        
        if (dealInfo.teamId) {
            setTimeout(() => {
                const teamSelect = document.getElementById('contract_team');
                if (teamSelect) {
                    teamSelect.value = dealInfo.teamId;
                }
            }, 100);
        }
        
        if (dealInfo.competitionId) {
            setTimeout(() => {
                const compSelect = document.getElementById('contract_competition');
                if (compSelect) {
                    compSelect.value = dealInfo.competitionId;
                }
            }, 100);
        }
        
        window.currentSignedDeal = null;
    }

    getModalHTML() {
        const isEdit = !!this.currentContract;
        const title = isEdit ? 'Edit Contract' : 'Add Contract';
        
        return `
        <div id="contract-modal" class="modal" style="display: none;">
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h2>${title}</h2>
                    <button class="modal-close" id="close-contract-modal">&times;</button>
                </div>
                <form id="contract-form">
                    <div class="form-section">
                        <h3 class="form-section-title">Team & Competition</h3>
                        <div class="form-grid">
                            <div class="form-group">
                                <label for="contract_team">Team *</label>
                                <select id="contract_team" name="team_id" required>
                                    <option value="">Select Team</option>
                                    ${this.getTeamsOptions()}
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="contract_competition">Competition *</label>
                                <select id="contract_competition" name="competition_id" required>
                                    <option value="">Select Competition</option>
                                    ${this.getCompetitionsOptions()}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h3 class="form-section-title">Contract Details</h3>
                        <div class="form-grid">
                            <div class="form-group">
                                <label for="contract_value">Contract Value (€) *</label>
                                <input type="number" id="contract_value" name="contract_value" 
                                       step="0.01" min="0" required placeholder="50000.00">
                            </div>
                            <div class="form-group">
                                <label for="commission_percentage">Commission (%) *</label>
                                <input type="number" id="commission_percentage" name="commission_percentage" 
                                       step="0.01" min="0" max="100" required placeholder="10.00">
                                <small class="calculated-value">
                                    Commission Amount: <span id="calculated_commission">€0.00</span>
                                </small>
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h3 class="form-section-title">Contract Period</h3>
                        <div class="form-grid">
                            <div class="form-group">
                                <label for="contract_start_date">Start Date *</label>
                                <input type="date" id="contract_start_date" name="contract_start_date" required>
                            </div>
                            <div class="form-group">
                                <label for="contract_end_date">End Date *</label>
                                <input type="date" id="contract_end_date" name="contract_end_date" required>
                            </div>
                        </div>
                        <div class="form-group-full" style="margin-top: 16px;">
                            <label class="checkbox-label" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                <input type="checkbox" id="added_retroactively" name="added_retroactively" style="width: 18px; height: 18px;">
                                <span style="font-weight: 600; color: var(--gray-900);">📋 This is a historical contract (already expired)</span>
                            </label>
                            <small style="color: var(--gray-600); display: block; margin-top: 8px; margin-left: 26px;">
                                ⚠️ Historical contracts are for tracking purposes only. They won't create payments, update player status, or appear as active contracts.
                            </small>
                        </div>
                    </div>

                    <div class="form-section">
                        <h3 class="form-section-title">Additional Information</h3>
                        <div class="form-group-full">
                            <label for="contract_notes">Notes</label>
                            <textarea id="contract_notes" name="notes" rows="3" 
                                      placeholder="Any additional notes about this contract..."></textarea>
                        </div>
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn-secondary" id="cancel-contract">Cancel</button>
                        <button type="submit" class="btn-primary">
                            ${isEdit ? 'Update Contract' : 'Create Contract'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
        `;
    }

    getTeamsOptions() {
        return this.teams.map(team => {
            const competitionName = team.competitions?.name || '';
            const displayName = competitionName ? `${team.name} (${competitionName})` : team.name;
            return `<option value="${team.id}">${displayName}</option>`;
        }).join('');
    }

    getCompetitionsOptions() {
        return this.competitions.map(comp => 
            `<option value="${comp.id}">${comp.name} - ${comp.country}</option>`
        ).join('');
    }

    populateForm() {
        if (!this.currentContract) return;
        
        console.log('📝 Populating form with contract data...');
        
        document.getElementById('contract_team').value = this.currentContract.team_id;
        document.getElementById('contract_competition').value = this.currentContract.competition_id;
        document.getElementById('contract_value').value = this.currentContract.contract_value;
        document.getElementById('commission_percentage').value = this.currentContract.commission_percentage;
        document.getElementById('contract_start_date').value = this.currentContract.contract_start_date;
        document.getElementById('contract_end_date').value = this.currentContract.contract_end_date;
        document.getElementById('contract_notes').value = this.currentContract.notes || '';
        document.getElementById('added_retroactively').checked = this.currentContract.added_retroactively || false;
        
        this.updateCalculatedCommission();
    }

    // ===================================
    // EVENT LISTENERS
    // ===================================

    attachEventListeners() {
        document.getElementById('close-contract-modal').addEventListener('click', () => {
            this.closeModal();
        });
        
        document.getElementById('cancel-contract').addEventListener('click', () => {
            this.closeModal();
        });
        
        document.getElementById('contract-modal').addEventListener('click', (e) => {
            if (e.target.id === 'contract-modal') {
                this.closeModal();
            }
        });
        
        document.getElementById('contract_value').addEventListener('input', () => {
            this.updateCalculatedCommission();
        });
        
        document.getElementById('commission_percentage').addEventListener('input', () => {
            this.updateCalculatedCommission();
        });
        
        // Auto-check retroactive if end date is in the past - only when user finishes entering date
        document.getElementById('contract_end_date').addEventListener('blur', () => {
            this.autoCheckRetroactive();
        });
        
        document.getElementById('contract-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveContract();
        });
    }

    autoCheckRetroactive() {
        const endDate = document.getElementById('contract_end_date').value;
        
        // Only check if we have a complete date (YYYY-MM-DD format)
        if (endDate && endDate.length === 10) {
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Reset time to compare only dates
            
            const contractEndDate = new Date(endDate);
            
            // Check if the date is valid
            if (isNaN(contractEndDate.getTime())) {
                return; // Invalid date, don't check
            }
            
            contractEndDate.setHours(0, 0, 0, 0);
            
            const retroactiveCheckbox = document.getElementById('added_retroactively');
            
            if (contractEndDate < today) {
                // End date is in the past - suggest retroactive
                if (!retroactiveCheckbox.checked) {
                    const shouldMark = confirm(
                        '⚠️ The contract end date is in the past.\n\n' +
                        'Would you like to mark this as a historical contract?\n\n' +
                        'Historical contracts are for tracking purposes only and won\'t:\n' +
                        '• Create payment records\n' +
                        '• Update player status\n' +
                        '• Appear as active contracts'
                    );
                    
                    if (shouldMark) {
                        retroactiveCheckbox.checked = true;
                    }
                }
            }
        }
    }

    updateCalculatedCommission() {
        const value = parseFloat(document.getElementById('contract_value').value) || 0;
        const percentage = parseFloat(document.getElementById('commission_percentage').value) || 0;
        const commission = (value * percentage) / 100;
        
        document.getElementById('calculated_commission').textContent = 
            `€${commission.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    // ===================================
    // SAVE CONTRACT
    // ===================================

    async saveContract() {
        try {
            console.log('💾 Saving contract...');
            
            const endDate = document.getElementById('contract_end_date').value;
            const isRetroactive = document.getElementById('added_retroactively').checked;
            
            // Determine if contract should be active or historical
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const contractEndDate = new Date(endDate);
            contractEndDate.setHours(0, 0, 0, 0);
            
            // Contract is active ONLY if:
            // 1. End date is in the future AND
            // 2. NOT marked as retroactive
            const isActive = (contractEndDate >= today) && !isRetroactive;
            
            const formData = {
                player_id: this.currentPlayerId,
                team_id: document.getElementById('contract_team').value,
                competition_id: document.getElementById('contract_competition').value,
                contract_value: parseFloat(document.getElementById('contract_value').value),
                commission_percentage: parseFloat(document.getElementById('commission_percentage').value),
                contract_start_date: document.getElementById('contract_start_date').value,
                contract_end_date: endDate,
                notes: document.getElementById('contract_notes').value.trim() || null,
                is_active: isActive,
                added_retroactively: isRetroactive
            };
            
            if (window.currentContractDealId) {
                formData.team_deal_id = window.currentContractDealId;
                console.log('🔗 Linking contract to deal:', window.currentContractDealId);
            }
            
            // Validate dates
            if (new Date(formData.contract_end_date) <= new Date(formData.contract_start_date)) {
                alert('End date must be after start date!');
                return;
            }
            
            let result;
            
            if (this.currentContract) {
                // UPDATE existing contract
                console.log('✏️ Updating contract:', this.currentContract.id);
                
                result = await supabase
                    .from('contracts')
                    .update(formData)
                    .eq('id', this.currentContract.id)
                    .select(`
                        *,
                        teams:team_id (name, city),
                        competitions:competition_id (name)
                    `)
                    .single();
                
            } else {
                // CREATE new contract
                console.log('➕ Creating new contract');
                console.log('📊 Contract status:', {
                    isActive,
                    isRetroactive,
                    endDate,
                    today: today.toISOString().split('T')[0]
                });
                
                result = await supabase
                    .from('contracts')
                    .insert([formData])
                    .select(`
                        *,
                        teams:team_id (name, city),
                        competitions:competition_id (name)
                    `)
                    .single();
                
                // ONLY if contract is ACTIVE (not historical):
                if (isActive) {
                    console.log('✅ Active contract - updating player status and creating payment');
                    
                    // Update player status to 'signed'
                    await supabase
                        .from('players')
                        .update({ 
                            player_deal_status: 'signed',
                            current_contract_id: result.data.id
                        })
                        .eq('id', this.currentPlayerId);
                    
                    // Create payment record
                    const commissionAmount = (formData.contract_value * formData.commission_percentage) / 100;
                    
                    await supabase
                        .from('payments')
                        .insert([{
                            contract_id: result.data.id,
                            amount: commissionAmount,
                            due_date: formData.contract_end_date,
                            status: 'pending'
                        }]);
                    
                    console.log('✅ Payment record created');
                    
                    // Create automatic reminders for contract expiration
                    const contractEndDate = new Date(formData.contract_end_date);
                    const today = new Date();
                    
                    // Create reminders only if contract end date is in the future
                    if (contractEndDate > today) {
                        console.log('📅 Creating automatic contract expiration reminders...');
                        
                        // Calculate reminder dates
                        const reminder90Days = new Date(contractEndDate);
                        reminder90Days.setDate(reminder90Days.getDate() - 90);
                        
                        const reminder30Days = new Date(contractEndDate);
                        reminder30Days.setDate(reminder30Days.getDate() - 30);
                        
                        const reminders = [];
                        
                        // Add 90-day reminder if it's in the future
                        if (reminder90Days > today) {
                            reminders.push({
                                title: `Contract expiring in 90 days - ${result.data.teams.name}`,
                                description: `Contract with ${result.data.teams.name} expires on ${contractEndDate.toLocaleDateString('it-IT')}`,
                                due_date: reminder90Days.toISOString().split('T')[0],
                                completed: false,
                                tag: 'contract',
                                player_id: this.currentPlayerId,
                                contract_id: result.data.id,
                                auto_generated: true
                            });
                        }
                        
                        // Add 30-day reminder if it's in the future
                        if (reminder30Days > today) {
                            reminders.push({
                                title: `Contract expiring in 30 days - ${result.data.teams.name}`,
                                description: `Contract with ${result.data.teams.name} expires on ${contractEndDate.toLocaleDateString('it-IT')}. Time to negotiate renewal or find new opportunities.`,
                                due_date: reminder30Days.toISOString().split('T')[0],
                                completed: false,
                                tag: 'contract',
                                player_id: this.currentPlayerId,
                                contract_id: result.data.id,
                                auto_generated: true
                            });
                        }
                        
                        // Add expiration day reminder
                        reminders.push({
                            title: `CONTRACT EXPIRES TODAY - ${result.data.teams.name}`,
                            description: `Contract with ${result.data.teams.name} expires today! Ensure renewal is signed or player is free agent.`,
                            due_date: contractEndDate.toISOString().split('T')[0],
                            completed: false,
                            tag: 'contract',
                            player_id: this.currentPlayerId,
                            contract_id: result.data.id,
                            auto_generated: true
                        });
                        
                        // Insert reminders if any were created
                        if (reminders.length > 0) {
                            const { error: reminderError } = await supabase
                                .from('reminders')
                                .insert(reminders);
                            
                            if (reminderError) {
                                console.error('⚠️ Error creating reminders:', reminderError);
                            } else {
                                console.log(`✅ Created ${reminders.length} automatic reminder(s) for contract expiration`);
                            }
                        }
                    }
                } else {
                    console.log('📋 Historical contract - skipping player status update, payment creation, and reminders');
                }
            }
            
            if (result.error) throw result.error;
            
            console.log('✅ Contract saved successfully:', result.data);
            
            window.currentContractDealId = null;
            window.currentSignedDeal = null;
            
            this.closeModal();
            
            const contractType = isActive ? 'active contract' : 'historical contract';
            alert(`✅ ${contractType.charAt(0).toUpperCase() + contractType.slice(1)} ${this.currentContract ? 'updated' : 'created'} successfully!${!isActive ? '\n\n📋 This contract appears in Contract History only.' : ''}`);
            
            if (window.showPlayerDetail && this.currentPlayerId) {
                window.showPlayerDetail(this.currentPlayerId, 'player');
            }
            
            if (window.loadPlayers) {
                await window.loadPlayers();
            }
            
            if (window.loadTeamDealsAfterContract && this.currentPlayerId) {
                await window.loadTeamDealsAfterContract(this.currentPlayerId);
            }
            
        } catch (error) {
            console.error('❌ Error saving contract:', error);
            alert('Error saving contract. Please try again.\n\n' + error.message);
        }
    }

    // ===================================
    // MODAL CONTROLS
    // ===================================

    showModal() {
        const modal = document.getElementById('contract-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    closeModal() {
        const modal = document.getElementById('contract-modal');
        if (modal) {
            modal.style.display = 'none';
            setTimeout(() => {
                modal.remove();
            }, 300);
        }
    }
}

// ===================================
// GLOBAL FUNCTION TO OPEN CONTRACT MANAGER
// ===================================

window.openContractManager = async function(playerId) {
    const manager = new ContractManager();
    await manager.init(playerId);
};

console.log('✅ Contract Manager module loaded');