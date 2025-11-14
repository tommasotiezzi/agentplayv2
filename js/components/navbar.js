/* ===================================
   NAVBAR COMPONENT - REUSABLE
   =================================== */

class Navbar {
    constructor() {
        this.currentUser = null;
    }

    async init() {
        await this.loadUser();
        this.render();
        this.attachEventListeners();
    }

    async loadUser() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                this.currentUser = session.user;
            }
        } catch (error) {
            console.error('Error loading user:', error);
        }
    }

    render() {
        const navbarHTML = `
            <nav class="navbar">
                <div class="nav-brand">
                    <div class="logo-circle-small">🏀</div>
                    <span>Agent Platform</span>
                </div>
                <div class="nav-user">
                    <span id="user-email">${this.currentUser?.email || 'Loading...'}</span>
                    <button id="logout-btn" class="btn-logout">Esci</button>
                </div>
            </nav>
        `;

        // Insert at the beginning of body
        document.body.insertAdjacentHTML('afterbegin', navbarHTML);
    }

    attachEventListeners() {
        const logoutBtn = document.getElementById('logout-btn');
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    const { error } = await supabase.auth.signOut();
                    if (error) throw error;
                    
                    console.log('✅ Logout successful');
                    window.location.href = '../index.html';
                } catch (error) {
                    console.error('❌ Logout error:', error);
                    alert('Errore durante il logout. Riprova.');
                }
            });
        }
    }
}

// Auto-initialize navbar on pages that need it
document.addEventListener('DOMContentLoaded', async () => {
    // Check if this page should have a navbar (not auth pages)
    if (!document.body.classList.contains('auth-page')) {
        const navbar = new Navbar();
        await navbar.init();
    }
});