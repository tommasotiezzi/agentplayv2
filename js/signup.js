/* ===================================
   SIGNUP AUTHENTICATION
   =================================== */

// Check if user is already logged in
async function checkAuthStatus() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        console.log('✅ User already logged in, redirecting to dashboard...');
        window.location.href = 'dashboard.html';
    }
}

// Handle signup form submission
const signupForm = document.getElementById('signup-form');
const errorMessage = document.getElementById('error-message');
const successMessage = document.getElementById('success-message');
const btnText = document.getElementById('btn-text');
const btnLoader = document.getElementById('btn-loader');

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get form values
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    // Clear previous messages
    errorMessage.style.display = 'none';
    errorMessage.textContent = '';
    successMessage.style.display = 'none';
    successMessage.textContent = '';
    
    // Validate passwords match
    if (password !== confirmPassword) {
        errorMessage.style.display = 'block';
        errorMessage.textContent = 'Le password non coincidono';
        return;
    }
    
    // Validate password length
    if (password.length < 6) {
        errorMessage.style.display = 'block';
        errorMessage.textContent = 'La password deve contenere almeno 6 caratteri';
        return;
    }
    
    // Show loader
    btnText.style.display = 'none';
    btnLoader.style.display = 'block';
    signupForm.querySelector('button').disabled = true;
    
    try {
        // Attempt signup
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
        });
        
        if (error) throw error;
        
        console.log('✅ Signup successful!', data);
        
        // Show success message
        successMessage.style.display = 'block';
        successMessage.textContent = 'Registrazione completata! Controlla la tua email per confermare l\'account.';
        
        // Clear form
        signupForm.reset();
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
            window.location.href = '../index.html';
        }, 3000);
        
    } catch (error) {
        console.error('❌ Signup error:', error);
        
        // Show error message
        errorMessage.style.display = 'block';
        
        if (error.message.includes('already registered')) {
            errorMessage.textContent = 'Questo indirizzo email è già registrato';
        } else if (error.message.includes('valid email')) {
            errorMessage.textContent = 'Inserisci un indirizzo email valido';
        } else {
            errorMessage.textContent = error.message || 'Errore durante la registrazione';
        }
        
        // Reset button
        btnText.style.display = 'block';
        btnLoader.style.display = 'none';
        signupForm.querySelector('button').disabled = false;
    }
});

// Check auth status on page load
checkAuthStatus();