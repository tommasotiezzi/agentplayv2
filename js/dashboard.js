/* ===================================
   DASHBOARD - AUTH PROTECTION & LOGIC
   =================================== */

let currentUser = null;

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
        
        // Display user email
        document.getElementById('user-email').textContent = currentUser.email;
        
    } catch (error) {
        console.error('❌ Auth check error:', error);
        window.location.href = '../index.html';
    }
}

// Handle logout
const logoutBtn = document.getElementById('logout-btn');

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

// Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event);
    
    if (event === 'SIGNED_OUT') {
        window.location.href = '../index.html';
    }
});

// Initialize dashboard
checkAuth();