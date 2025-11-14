async function checkAuthStatus() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        console.log('✅ User already logged in, redirecting to dashboard...');
        window.location.href = 'dashboard.html';
    }
}

const signupForm = document.getElementById('signup-form');
const errorMessage = document.getElementById('error-message');
const successMessage = document.getElementById('success-message');
const btnText = document.getElementById('btn-text');
const btnLoader = document.getElementById('btn-loader');

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    errorMessage.style.display = 'none';
    errorMessage.textContent = '';
    successMessage.style.display = 'none';
    successMessage.textContent = '';
    
    if (password !== confirmPassword) {
        errorMessage.style.display = 'block';
        errorMessage.textContent = 'Le password non coincidono';
        return;
    }
    
    if (password.length < 6) {
        errorMessage.style.display = 'block';
        errorMessage.textContent = 'La password deve contenere almeno 6 caratteri';
        return;
    }
    
    btnText.style.display = 'none';
    btnLoader.style.display = 'block';
    signupForm.querySelector('button').disabled = true;
    
    try {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
        });
        
        if (error) throw error;
        
        console.log('✅ Signup successful!', data);
        
        successMessage.style.display = 'block';
        successMessage.textContent = 'Registrazione completata! Controlla la tua email per confermare l\'account.';
        
        signupForm.reset();
        
        setTimeout(() => {
            window.location.href = '../index.html';
        }, 3000);
        
    } catch (error) {
        console.error('❌ Signup error:', error);
        
        errorMessage.style.display = 'block';
        
        if (error.message.includes('already registered')) {
            errorMessage.textContent = 'Questo indirizzo email è già registrato';
        } else if (error.message.includes('valid email')) {
            errorMessage.textContent = 'Inserisci un indirizzo email valido';
        } else {
            errorMessage.textContent = error.message || 'Errore durante la registrazione';
        }
        
        btnText.style.display = 'block';
        btnLoader.style.display = 'none';
        signupForm.querySelector('button').disabled = false;
    }
});

checkAuthStatus();