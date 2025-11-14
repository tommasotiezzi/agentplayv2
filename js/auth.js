/* ===================================
   LOGIN AUTHENTICATION
   =================================== */

// Check if user is already logged in
async function checkAuthStatus() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        console.log('✅ User already logged in, redirecting to dashboard...');
        window.location.href = 'pages/dashboard.html';
    }
}

// Handle login form submission
const loginForm = document.getElementById('login-form');
const errorMessage = document.getElementById('error-message');
const btnText = document.getElementById('btn-text');
const btnLoader = document.getElementById('btn-loader');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get form values
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    // Clear previous errors
    errorMessage.style.display = 'none';
    errorMessage.textContent = '';
    
    // Show loader
    btnText.style.display = 'none';
    btnLoader.style.display = 'block';
    loginForm.querySelector('button').disabled = true;
    
    try {
        // Attempt login
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });
        
        if (error) throw error;
        
        console.log('✅ Login successful!', data);
        
        // Redirect to dashboard
        window.location.href = 'pages/dashboard.html';
        
    } catch (error) {
        console.error('❌ Login error:', error);
        
        // Show error message
        errorMessage.style.display = 'block';
        
        if (error.message.includes('Invalid login credentials')) {
            errorMessage.textContent = 'Email o password non corretti';
        } else if (error.message.includes('Email not confirmed')) {
            errorMessage.textContent = 'Conferma la tua email prima di accedere';
        } else {
            errorMessage.textContent = error.message || 'Errore durante l\'accesso';
        }
        
        // Reset button
        btnText.style.display = 'block';
        btnLoader.style.display = 'none';
        loginForm.querySelector('button').disabled = false;
    }
});

// Check auth status on page load
checkAuthStatus();