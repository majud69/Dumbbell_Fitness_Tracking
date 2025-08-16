/**
 * Perbaikan Navigasi Halaman - Dumbbell Fitness
 * 
 * Script ini memperbaiki struktur navigasi pada aplikasi Dumbbell Fitness
 * agar konten halaman terpisah dengan benar saat mengklik menu navigasi.
 */
window.navigationInitialized = true;

document.addEventListener('DOMContentLoaded', function() {
    // 1. Perbaiki struktur halaman dengan style CSS tambahan
    addPageStyles();
    
    // 2. Setup navigasi yang lebih baik
    setupImprovedNavigation();
    
    // 3. Pastikan hanya halaman aktif yang terlihat
    showActivePage();
    
    // 4. Terapkan fitur mobile menu yang lebih baik
    setupMobileMenu();
});

/**
 * Menambahkan style CSS untuk perbaikan struktur halaman
 */
function addPageStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* CSS untuk memastikan halaman tidak bertumpuk */
        .pages-container {
            position: relative;
            min-height: calc(100vh - 80px);
            width: 100%;
        }
        
        .page {
            display: none;
            opacity: 0;
            transition: opacity 0.3s ease;
            width: 100%;
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            padding-bottom: 30px;
        }
        
        .page.active {
            display: block;
            opacity: 1;
            position: relative;
        }
        
        /* Fix untuk mobile menu */
        @media (max-width: 768px) {
            .sidebar {
                transform: translateX(-100%);
                transition: transform 0.3s ease;
                z-index: 1010;
            }
            
            .sidebar.show {
                transform: translateX(0);
            }
            
            main {
                margin-left: 0;
                width: 100%;
                padding-left: 1rem;
                padding-right: 1rem;
                transition: all 0.3s ease;
            }
            
            .mobile-menu-toggle {
                display: block !important;
                position: fixed;
                top: 15px;
                left: 15px;
                z-index: 1020;
                background-color: var(--primary-color);
                color: white;
                border: none;
                border-radius: 4px;
                padding: 0.5rem;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            }
        }
    `;
    document.head.appendChild(style);
    
    console.log('Page styles added for improved navigation');
}

/**
 * Setup sistem navigasi yang lebih baik
 */
function setupImprovedNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Ambil target halaman
            const targetId = this.getAttribute('data-target');
            
            // Hapus class active dari semua link
            navLinks.forEach(l => l.classList.remove('active'));
            
            // Tambahkan class active ke link yang diklik
            this.classList.add('active');
            
            // Sembunyikan semua halaman dengan transisi yang halus
            const pages = document.querySelectorAll('.page');
            pages.forEach(page => {
                page.classList.remove('active');
            });
            
            // Tampilkan halaman target dengan efek fade-in
            const targetPage = document.getElementById(targetId);
            if (targetPage) {
                setTimeout(() => {
                    targetPage.classList.add('active');
                    
                    // Scroll halaman ke atas
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    
                    // Tutup mobile menu jika terbuka
                    const sidebar = document.querySelector('.sidebar');
                    const overlay = document.querySelector('.sidebar-overlay');
                    if (sidebar && sidebar.classList.contains('show')) {
                        sidebar.classList.remove('show');
                        if (overlay) overlay.classList.remove('show');
                    }
                }, 50);
            }
            
            // Simpan halaman aktif di sessionStorage
            sessionStorage.setItem('activePageId', targetId);
            
            console.log('Navigated to page:', targetId);
        });
    });
    
    console.log('Improved navigation setup completed');
}

/**
 * Menampilkan halaman aktif berdasarkan sessionStorage atau default ke dashboard
 */
function showActivePage() {
    // Cek halaman aktif dari sessionStorage
    const activePageId = sessionStorage.getItem('activePageId') || 'dashboard';
    
    // Aktifkan link navigasi yang sesuai
    const navLink = document.querySelector(`.nav-link[data-target="${activePageId}"]`);
    if (navLink) {
        navLink.click();
    } else {
        // Default ke dashboard jika tidak ada link yang sesuai
        const defaultLink = document.querySelector('.nav-link[data-target="dashboard"]');
        if (defaultLink) defaultLink.click();
    }
    
    console.log('Active page displayed:', activePageId);
}

/**
 * Setup mobile menu dengan overlay dan toggle yang lebih baik
 */
function setupMobileMenu() {
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    
    // Buat overlay jika belum ada
    if (!sidebarOverlay && sidebar) {
        const overlay = document.createElement('div');
        overlay.id = 'sidebar-overlay';
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);
        
        overlay.addEventListener('click', function() {
            sidebar.classList.remove('show');
            this.classList.remove('show');
        });
    }
    
    // Pastikan toggle button ada untuk mobile
    if (!mobileMenuToggle && sidebar) {
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'mobile-menu-toggle';
        toggleBtn.className = 'mobile-menu-toggle';
        toggleBtn.innerHTML = '<i class="fas fa-bars"></i>';
        toggleBtn.style.display = 'none'; // Akan ditampilkan via media query
        document.body.appendChild(toggleBtn);
        
        toggleBtn.addEventListener('click', function() {
            sidebar.classList.toggle('show');
            document.getElementById('sidebar-overlay').classList.toggle('show');
        });
    }
    
    console.log('Mobile menu setup completed');
}

/**
 * Fungsi untuk memperbaiki masalah spesifik pada halaman tambah data
 * dimana semua input form terlihat pada halaman profil
 */
function fixAddDataFormVisibility() {
    // Pastikan form hanya terlihat pada halaman yang sesuai
    const addDataForms = document.querySelectorAll('#add-data form, #add-data .form-row');
    
    addDataForms.forEach(form => {
        // Pastikan form hanya terlihat pada halaman add-data
        form.style.display = 'none';
        
        // Tambahkan listener untuk menampilkan form hanya saat halaman add-data aktif
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', function() {
                const targetId = this.getAttribute('data-target');
                if (targetId === 'add-data') {
                    form.style.display = 'block';
                } else {
                    form.style.display = 'none';
                }
            });
        });
    });
    
    console.log('Add data form visibility fixed');
}

// Panggil fungsi tambahan jika diperlukan
setTimeout(() => {
    fixAddDataFormVisibility();
}, 1000);