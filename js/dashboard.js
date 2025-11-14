/* ===================================
   DASHBOARD - AUTH PROTECTION & LOGIC
   =================================== */

let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    initSidebar('dashboard'); // Initialize sidebar with 'dashboard' as active
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

// Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event);
    
    if (event === 'SIGNED_OUT') {
        window.location.href = '../index.html';
    }
});