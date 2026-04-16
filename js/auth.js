// Auth Management
const ADMIN_CREDENTIALS = {
    email: 'waraga@gmail.com',
    password: 'admin123'
};

class Auth {
    static isAdmin() {
        return localStorage.getItem('isAdmin') === 'true';
    }

    static login(email, password) {
        if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
            localStorage.setItem('isAdmin', 'true');
            return true;
        }
        return false;
    }

    static logout() {
        localStorage.removeItem('isAdmin');
        // Redirect ke halaman beranda setelah logout
        window.location.href = 'index.html';
    }
}

// Handle Login Form
if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        if (Auth.login(email, password)) {
            // Redirect ke halaman admin setelah login
            window.location.href = 'admin.html';
        } else {
            alert('Email atau password salah!');
        }
    });
}

// Update UI based on auth state
function updateAuthUI() {
    const isAdmin = Auth.isAdmin();
    
    // Untuk halaman index
    const loginBtn = document.getElementById('navLogin');
    const logoutBtn = document.getElementById('navLogout');
    const dashboardLink = document.getElementById('navDashboard');
    const createDocBtn = document.getElementById('createDocBtn');
    const manageDocsBtn = document.getElementById('manageDocsBtn');
    
    if (loginBtn) {
        loginBtn.style.display = isAdmin ? 'none' : 'inline-block';
    }
    
    if (logoutBtn) {
        logoutBtn.style.display = isAdmin ? 'inline-block' : 'none';
        if (isAdmin) {
            logoutBtn.onclick = (e) => {
                e.preventDefault();
                Auth.logout();
            };
        }
    }
    
    if (dashboardLink) {
        dashboardLink.style.display = isAdmin ? 'inline-block' : 'none';
        if (isAdmin) {
            dashboardLink.href = 'admin.html';
        }
    }
    
    // Tombol create dan manage hanya untuk admin
    if (createDocBtn) {
        createDocBtn.style.display = isAdmin ? 'inline-block' : 'none';
        if (isAdmin) {
            createDocBtn.onclick = () => { window.location.href = 'admin.html'; };
        }
    }
    
    if (manageDocsBtn) {
        manageDocsBtn.style.display = isAdmin ? 'inline-block' : 'none';
        if (isAdmin) {
            manageDocsBtn.onclick = () => { window.location.href = 'admin.html'; };
        }
    }
    
    // Untuk halaman view
    const viewLoginBtn = document.getElementById('viewLoginBtn');
    const viewLogoutBtn = document.getElementById('viewLogoutBtn');
    
    if (viewLoginBtn) {
        viewLoginBtn.style.display = isAdmin ? 'none' : 'inline-block';
        viewLoginBtn.href = 'login.html';
    }
    
    if (viewLogoutBtn) {
        viewLogoutBtn.style.display = isAdmin ? 'inline-block' : 'none';
        if (isAdmin) {
            viewLogoutBtn.onclick = (e) => {
                e.preventDefault();
                Auth.logout();
            };
        }
    }
    
    // Admin actions di view page
    const viewAdminActions = document.getElementById('viewAdminActions');
    if (viewAdminActions) {
        viewAdminActions.style.display = isAdmin ? 'block' : 'none';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', updateAuthUI);


document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.getElementById('navLinks');

    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            
            // Ubah ikon dari hamburger ke 'X' saat terbuka
            const icon = menuToggle.querySelector('i');
            if (navLinks.classList.contains('active')) {
                icon.classList.replace('fa-bars', 'fa-times');
            } else {
                icon.classList.replace('fa-times', 'fa-bars');
            }
        });
    }
});
