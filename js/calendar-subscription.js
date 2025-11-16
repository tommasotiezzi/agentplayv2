/* ===================================
   ICAL SUBSCRIPTION MANAGER
   Handles calendar export and subscription with auth
   =================================== */

class CalendarSubscriptionManager {
    constructor() {
        this.baseUrl = window.location.origin;
        this.supabaseUrl = supabase.supabaseUrl;
        this.reminders = [];
    }

    // Generate a personal calendar token for the user
    async generateCalendarToken() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
                throw new Error('No active session');
            }

            // Store the current session token in localStorage for calendar access
            const calendarToken = session.access_token;
            
            // Generate the subscription URLs
            const feedUrl = `${this.supabaseUrl}/functions/v1/calendar-feed?token=${calendarToken}`;
            const webcalUrl = feedUrl.replace('https://', 'webcal://');
            
            return {
                feedUrl,
                webcalUrl,
                token: calendarToken
            };
            
        } catch (error) {
            console.error('Error generating calendar token:', error);
            throw error;
        }
    }

    // Show subscription modal with URLs
    async showSubscriptionModal() {
        try {
            const urls = await this.generateCalendarToken();
            
            const modalHTML = `
                <div id="calendar-subscription-modal" class="modal" style="display: flex; z-index: 10000;">
                    <div class="modal-content" style="max-width: 700px;">
                        <div class="modal-header">
                            <h2>📅 Subscribe to Your Calendar</h2>
                            <button class="modal-close" onclick="document.getElementById('calendar-subscription-modal').remove()">&times;</button>
                        </div>
                        
                        <div style="padding: 24px;">
                            <!-- Quick Subscribe Button for Apple Devices -->
                            <div style="background: linear-gradient(135deg, #007AFF 0%, #0051D5 100%); 
                                        border-radius: 12px; padding: 20px; margin-bottom: 24px; color: white;">
                                <h3 style="margin: 0 0 12px 0; color: white;">
                                    🍎 Quick Subscribe (Apple Devices)
                                </h3>
                                <p style="margin: 0 0 16px 0; opacity: 0.95;">
                                    If you're on an iPhone, iPad, or Mac, click below to add directly to Apple Calendar:
                                </p>
                                <a href="${urls.webcalUrl}" 
                                   class="btn-primary" 
                                   style="background: white; color: #007AFF; padding: 12px 24px; 
                                          display: inline-block; text-decoration: none; font-weight: 600;">
                                    + Add to Apple Calendar
                                </a>
                            </div>

                            <!-- Subscription URL -->
                            <div style="background: var(--gray-50); border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                                <label style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--gray-700);">
                                    📱 Calendar Subscription URL
                                </label>
                                <div style="display: flex; gap: 8px;">
                                    <input type="text" 
                                           id="calendar-feed-url"
                                           value="${urls.feedUrl}" 
                                           readonly 
                                           style="flex: 1; padding: 10px; border: 1px solid var(--gray-300); 
                                                  border-radius: 6px; font-family: monospace; font-size: 12px; 
                                                  background: white;"
                                           onclick="this.select()">
                                    <button onclick="copyCalendarUrl()" 
                                            class="btn-secondary" 
                                            style="padding: 10px 20px; display: flex; align-items: center; gap: 6px;">
                                        <span>📋</span>
                                        <span id="copy-btn-text">Copy</span>
                                    </button>
                                </div>
                                <small style="color: var(--gray-600); margin-top: 8px; display: block;">
                                    ⚠️ This URL contains your personal access token. Do not share it publicly.
                                </small>
                            </div>

                            <!-- Instructions Tabs -->
                            <div style="margin-bottom: 20px;">
                                <div style="display: flex; gap: 8px; border-bottom: 2px solid var(--gray-200); margin-bottom: 20px;">
                                    <button onclick="showInstructionTab('apple')" 
                                            id="tab-apple" 
                                            class="instruction-tab active"
                                            style="padding: 10px 16px; background: none; border: none; 
                                                   font-weight: 600; cursor: pointer; color: var(--primary-blue);
                                                   border-bottom: 2px solid var(--primary-blue);">
                                        🍎 Apple
                                    </button>
                                    <button onclick="showInstructionTab('google')" 
                                            id="tab-google" 
                                            class="instruction-tab"
                                            style="padding: 10px 16px; background: none; border: none; 
                                                   font-weight: 600; cursor: pointer; color: var(--gray-600);
                                                   border-bottom: 2px solid transparent;">
                                        📅 Google
                                    </button>
                                    <button onclick="showInstructionTab('outlook')" 
                                            id="tab-outlook" 
                                            class="instruction-tab"
                                            style="padding: 10px 16px; background: none; border: none; 
                                                   font-weight: 600; cursor: pointer; color: var(--gray-600);
                                                   border-bottom: 2px solid transparent;">
                                        📧 Outlook
                                    </button>
                                </div>

                                <!-- Apple Instructions -->
                                <div id="instructions-apple" class="instruction-content">
                                    <h4 style="margin: 0 0 16px 0;">Apple Calendar (iPhone/iPad)</h4>
                                    <ol style="line-height: 1.8; color: var(--gray-700);">
                                        <li>Open <strong>Settings</strong> → <strong>Calendar</strong></li>
                                        <li>Tap <strong>Accounts</strong> → <strong>Add Account</strong></li>
                                        <li>Select <strong>Other</strong> → <strong>Add Subscribed Calendar</strong></li>
                                        <li>Paste the URL above and tap <strong>Next</strong></li>
                                        <li>Customize settings and tap <strong>Save</strong></li>
                                    </ol>
                                    
                                    <h4 style="margin: 20px 0 16px 0;">Apple Calendar (Mac)</h4>
                                    <ol style="line-height: 1.8; color: var(--gray-700);">
                                        <li>Open <strong>Calendar</strong> app</li>
                                        <li>Click <strong>File</strong> → <strong>New Calendar Subscription</strong></li>
                                        <li>Paste the URL and click <strong>Subscribe</strong></li>
                                        <li>Set <strong>Auto-refresh</strong> to "Every 30 minutes"</li>
                                        <li>Click <strong>OK</strong></li>
                                    </ol>
                                </div>

                                <!-- Google Instructions -->
                                <div id="instructions-google" class="instruction-content" style="display: none;">
                                    <h4 style="margin: 0 0 16px 0;">Google Calendar</h4>
                                    <ol style="line-height: 1.8; color: var(--gray-700);">
                                        <li>Open <strong>Google Calendar</strong> on computer</li>
                                        <li>Click <strong>+</strong> next to "Other calendars"</li>
                                        <li>Select <strong>From URL</strong></li>
                                        <li>Paste the URL above</li>
                                        <li>Click <strong>Add calendar</strong></li>
                                    </ol>
                                    <p style="color: var(--gray-600); margin-top: 12px;">
                                        📱 Note: You must add the calendar on a computer first. 
                                        It will then sync to your mobile app automatically.
                                    </p>
                                </div>

                                <!-- Outlook Instructions -->
                                <div id="instructions-outlook" class="instruction-content" style="display: none;">
                                    <h4 style="margin: 0 0 16px 0;">Outlook / Microsoft 365</h4>
                                    <ol style="line-height: 1.8; color: var(--gray-700);">
                                        <li>Go to <strong>outlook.com</strong> or open Outlook app</li>
                                        <li>Click <strong>Add calendar</strong></li>
                                        <li>Select <strong>Subscribe from web</strong></li>
                                        <li>Paste the URL above</li>
                                        <li>Name it "AgentPlay Reminders"</li>
                                        <li>Click <strong>Import</strong></li>
                                    </ol>
                                </div>
                            </div>

                            <!-- Features List -->
                            <div style="background: #f0f9ff; border-radius: 8px; padding: 16px; margin-top: 20px;">
                                <h4 style="margin: 0 0 12px 0; color: #0369a1;">✨ What You'll Get</h4>
                                <ul style="margin: 0; padding-left: 20px; line-height: 1.6; color: #0c4a6e;">
                                    <li>Automatic sync of all your reminders</li>
                                    <li>Real-time updates when reminders change</li>
                                    <li>Native notifications on all your devices</li>
                                    <li>Contract expiration alerts</li>
                                    <li>Deal negotiation reminders</li>
                                    <li>Payment due dates</li>
                                </ul>
                            </div>

                            <!-- Alternative Download -->
                            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--gray-200); 
                                        text-align: center;">
                                <p style="color: var(--gray-600); margin-bottom: 12px;">
                                    Need a one-time export instead?
                                </p>
                                <button onclick="exportStaticICal()" class="btn-secondary">
                                    📥 Download .ics File
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            
        } catch (error) {
            console.error('Error showing subscription modal:', error);
            alert('Error generating calendar subscription. Please try again.');
        }
    }

    // Export static .ics file for one-time import
    async exportStaticICal() {
        try {
            // Load reminders
            const { data: reminders, error } = await supabase
                .from('reminders')
                .select(`
                    *,
                    players:player_id (first_name, last_name),
                    contracts:contract_id (
                        teams:team_id (name)
                    )
                `)
                .eq('completed', false)
                .order('due_date', { ascending: true });
            
            if (error) throw error;
            
            // Generate iCal content
            const icalContent = this.generateICalContent(reminders || []);
            
            // Download file
            const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `agentplay-reminders-${new Date().toISOString().split('T')[0]}.ics`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            console.log('✅ Static iCal file downloaded');
            
        } catch (error) {
            console.error('Error exporting calendar:', error);
            alert('Error exporting calendar. Please try again.');
        }
    }

    // Generate iCal content (same format as server)
    generateICalContent(reminders) {
        const lines = [];
        
        // Header
        lines.push('BEGIN:VCALENDAR');
        lines.push('VERSION:2.0');
        lines.push('PRODID:-//AgentPlay//Agent Platform Calendar//IT');
        lines.push('CALSCALE:GREGORIAN');
        lines.push('METHOD:PUBLISH');
        lines.push('X-WR-CALNAME:AgentPlay Reminders');
        lines.push('X-WR-CALDESC:Basketball agent reminders');
        lines.push('X-WR-TIMEZONE:Europe/Rome');
        
        // Events
        reminders.forEach(reminder => {
            lines.push('BEGIN:VEVENT');
            lines.push(`UID:${reminder.id}@agentplay.app`);
            
            const dueDate = new Date(reminder.due_date);
            const dateStr = dueDate.toISOString().split('T')[0].replace(/-/g, '');
            lines.push(`DTSTART;VALUE=DATE:${dateStr}`);
            lines.push(`DTEND;VALUE=DATE:${dateStr}`);
            
            lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`);
            lines.push(`SUMMARY:${this.escapeText(reminder.title)}`);
            
            if (reminder.description) {
                lines.push(`DESCRIPTION:${this.escapeText(reminder.description)}`);
            }
            
            lines.push('END:VEVENT');
        });
        
        lines.push('END:VCALENDAR');
        return lines.join('\r\n');
    }

    escapeText(text) {
        if (!text) return '';
        return text
            .replace(/\\/g, '\\\\')
            .replace(/;/g, '\\;')
            .replace(/,/g, '\\,')
            .replace(/\n/g, '\\n');
    }
}

// Global functions for buttons
window.showCalendarSubscription = async function() {
    const manager = new CalendarSubscriptionManager();
    await manager.showSubscriptionModal();
};

window.exportCalendarICal = async function() {
    const manager = new CalendarSubscriptionManager();
    await manager.exportStaticICal();
};

window.exportStaticICal = async function() {
    const manager = new CalendarSubscriptionManager();
    await manager.exportStaticICal();
};

window.copyCalendarUrl = function() {
    const input = document.getElementById('calendar-feed-url');
    input.select();
    document.execCommand('copy');
    
    const btnText = document.getElementById('copy-btn-text');
    btnText.textContent = 'Copied!';
    setTimeout(() => {
        btnText.textContent = 'Copy';
    }, 2000);
};

window.showInstructionTab = function(tab) {
    // Hide all content
    document.querySelectorAll('.instruction-content').forEach(el => {
        el.style.display = 'none';
    });
    
    // Reset all tabs
    document.querySelectorAll('.instruction-tab').forEach(el => {
        el.style.color = 'var(--gray-600)';
        el.style.borderBottom = '2px solid transparent';
    });
    
    // Show selected content
    document.getElementById(`instructions-${tab}`).style.display = 'block';
    
    // Highlight selected tab
    const selectedTab = document.getElementById(`tab-${tab}`);
    selectedTab.style.color = 'var(--primary-blue)';
    selectedTab.style.borderBottom = '2px solid var(--primary-blue)';
};

console.log('✅ Calendar Subscription Manager loaded');