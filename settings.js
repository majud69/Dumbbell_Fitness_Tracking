/**
 * Settings - Dumbbell Fitness
 * 
 * Consolidated settings management including theme handling
 * and settings page functionality.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize settings page
    enhanceSettingsPage();
    
    // Initialize theme from localStorage
    applyCurrentTheme();
    
    console.log('Settings manager initialized');
});

/**
 * Enhance the Settings page with improved UI and functionality
 */
function enhanceSettingsPage() {
    // Get the settings page
    const settingsPage = document.getElementById('settings');
    if (!settingsPage) return;
    
    // Check if the page already has the enhanced structure
    if (settingsPage.querySelector('.settings-card')) return;
    
    // Get existing content for migration
    const existingHeader = settingsPage.querySelector('.page-header')?.innerHTML || '<h2 class="page-title"><i class="fas fa-cog me-2"></i>Pengaturan</h2>';
    const existingContent = settingsPage.querySelector('.content-card');
    
    // Clear the page
    settingsPage.innerHTML = '';
    
    // Add the header
    const headerElement = document.createElement('div');
    headerElement.className = 'page-header animate__animated animate__fadeIn';
    headerElement.innerHTML = existingHeader;
    settingsPage.appendChild(headerElement);
    
    // Create the main settings card
    const settingsCard = document.createElement('div');
    settingsCard.className = 'settings-card animate__animated animate__fadeInUp';
    
    // Build the enhanced settings content
    settingsCard.innerHTML = `
        <!-- Theme Section -->
        <div class="settings-section">
            <h3 class="settings-section-title">
                <i class="fas fa-palette"></i>
                Tema Aplikasi
            </h3>
            <div class="theme-options">
                <button class="theme-btn theme-default" data-theme="default">
                    Default
                </button>
                <button class="theme-btn theme-dark active" data-theme="dark">
                    Dark
                </button>
                <button class="theme-btn theme-blue" data-theme="blue">
                    Blue
                </button>
            </div>
        </div>
        
        <!-- Notification Section -->
        <div class="settings-section">
            <h3 class="settings-section-title">
                <i class="fas fa-bell"></i>
                Notifikasi
            </h3>
            
            <!-- Weight Form -->
            <div class="weight-form-container">
                <h4>Input Berat Dumbbell</h4>
                <form id="set-weight-form">
                    <div class="weight-input-container">
                        <label for="dumbbell-weight" class="weight-form-label">Berat Dumbbell (kg)</label>
                        <div class="weight-input-with-icon">
                            <i class="fas fa-weight-hanging weight-input-icon"></i>
                            <input type="number" step="0.5" min="0.5" max="50" class="weight-input" id="dumbbell-weight" 
                                    placeholder="Masukkan berat dumbbell" required>
                        </div>
                    </div>
                    <button type="submit" class="btn-start">
                        <i class="fas fa-play-circle"></i> Mulai Latihan
                    </button>
                </form>
            </div>
        </div>
        
        <!-- Security Section -->
        <div class="settings-section">
            <h3 class="settings-section-title">
                <i class="fas fa-shield-alt"></i>
                Keamanan
            </h3>
            <div class="security-actions">
                <button type="button" class="btn-security" id="change-password-btn">
                    <i class="fas fa-key"></i> Ubah Kata Sandi
                </button>
                <button type="button" class="btn-security" id="export-data-btn">
                    <i class="fas fa-download"></i> Ekspor Data
                </button>
            </div>
        </div>
    `;
    
    // Append the settings card to the page
    settingsPage.appendChild(settingsCard);
    
    // Create password change modal
    createPasswordModal();
    
    // Add event listeners
    initializeSettingsEvents();
}

/**
 * Create Password Change Modal
 */
function createPasswordModal() {
    // Check if modal already exists
    if (document.getElementById('password-modal')) return;
    
    // Create modal HTML
    const modalHTML = `
        <div id="password-modal" class="modal-overlay">
            <div class="modal-container">
                <div class="modal-header">
                    <h4 class="modal-title"><i class="fas fa-key"></i> Ubah Kata Sandi</h4>
                    <button class="modal-close" id="modal-close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="password-change-form">
                        <div class="password-form-group">
                            <label for="current-password" class="password-form-label">Kata Sandi Saat Ini</label>
                            <div class="password-input-container">
                                <i class="fas fa-lock password-icon"></i>
                                <input type="password" id="current-password" class="password-input" required>
                                <button type="button" class="toggle-password" data-target="current-password">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
                        </div>
                        <div class="password-form-group">
                            <label for="new-password" class="password-form-label">Kata Sandi Baru</label>
                            <div class="password-input-container">
                                <i class="fas fa-key password-icon"></i>
                                <input type="password" id="new-password" class="password-input" required>
                                <button type="button" class="toggle-password" data-target="new-password">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
                        </div>
                        <div class="password-form-group">
                            <label for="confirm-password" class="password-form-label">Konfirmasi Kata Sandi</label>
                            <div class="password-input-container">
                                <i class="fas fa-check password-icon"></i>
                                <input type="password" id="confirm-password" class="password-input" required>
                                <button type="button" class="toggle-password" data-target="confirm-password">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn-cancel" id="modal-cancel-btn">Batal</button>
                    <button class="btn-save-password" id="save-password-btn">Simpan</button>
                </div>
            </div>
        </div>
    `;
    
    // Append modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

/**
 * Initialize event listeners for settings page
 */
function initializeSettingsEvents() {
    // Theme button click events
    const themeButtons = document.querySelectorAll('.theme-btn');
    themeButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            themeButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Apply theme
            const theme = this.getAttribute('data-theme');
            applyTheme(theme);
            
            // Save to localStorage
            localStorage.setItem('theme', theme);
            
            // Show success notification
            showThemeChangedNotification(theme);
        });
    });
    
    // Weight form submit event
    const weightForm = document.getElementById('set-weight-form');
    if (weightForm) {
        weightForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const weight = parseFloat(document.getElementById('dumbbell-weight').value);
            if (!weight || weight <= 0) {
                showNotification('Berat harus lebih dari 0', 'error');
                return;
            }
            
            // Display loading state
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memulai...';
            submitBtn.disabled = true;
            
            // Generate a session ID
            const sessionId = Date.now().toString();
            const userId = localStorage.getItem('current_user_id');
            
            if (!userId) {
                showNotification('User ID tidak ditemukan. Silakan login ulang.', 'error');
                
                // Reset button
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                return;
            }
            
            // Start session via API
            fetch(`${window.API_CONFIG ? window.API_CONFIG.BASE_URL : '/api'}/start-session.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: sessionId,
                    user_id: userId,
                    weight: weight
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    // Store the session ID in localStorage
                    localStorage.setItem('current_session', sessionId);
                    
                    // Show success message
                    showNotification('Sesi latihan dimulai!', 'success');
                    
                    // Navigate to dashboard
                    const dashboardLink = document.querySelector('.nav-link[data-target="dashboard"]');
                    if (dashboardLink) {
                        dashboardLink.click();
                    }
                } else {
                    showNotification(data.message || 'Gagal memulai sesi', 'error');
                    
                    // Reset button
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            })
            .catch(error => {
                console.error('Error starting session:', error);
                showNotification('Error koneksi ke server', 'error');
                
                // Reset button
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            });
        });
    }
    
    // Change password button
    const changePasswordBtn = document.getElementById('change-password-btn');
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', function() {
            const modal = document.getElementById('password-modal');
            if (modal) modal.classList.add('active');
        });
    }
    
    // Modal close button
    const modalCloseBtn = document.getElementById('modal-close-btn');
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', function() {
            const modal = document.getElementById('password-modal');
            if (modal) modal.classList.remove('active');
        });
    }
    
    // Modal cancel button
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    if (modalCancelBtn) {
        modalCancelBtn.addEventListener('click', function() {
            const modal = document.getElementById('password-modal');
            if (modal) modal.classList.remove('active');
        });
    }
    
    // Password toggle buttons
    const togglePasswordBtns = document.querySelectorAll('.toggle-password');
    togglePasswordBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const passwordInput = document.getElementById(targetId);
            
            if (passwordInput) {
                // Toggle between password and text
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                
                // Toggle icon
                const icon = this.querySelector('i');
                icon.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
            }
        });
    });
    
    // Save password button
    const savePasswordBtn = document.getElementById('save-password-btn');
    if (savePasswordBtn) {
        savePasswordBtn.addEventListener('click', function() {
            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            
            // Validate passwords
            if (!currentPassword || !newPassword || !confirmPassword) {
                showNotification('Semua field harus diisi', 'error');
                return;
            }
            
            if (newPassword !== confirmPassword) {
                showNotification('Kata sandi baru tidak cocok dengan konfirmasi', 'error');
                return;
            }
            
            // Show loading state
            savePasswordBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
            savePasswordBtn.disabled = true;
            
            // Simulate password change (would be an API call in production)
            setTimeout(() => {
                // Reset button
                savePasswordBtn.innerHTML = 'Simpan';
                savePasswordBtn.disabled = false;
                
                // Show success notification
                showNotification('Kata sandi berhasil diubah', 'success');
                
                // Close modal and reset form
                const modal = document.getElementById('password-modal');
                if (modal) {
                    modal.classList.remove('active');
                    document.getElementById('password-change-form').reset();
                }
            }, 1500);
        });
    }
    
    // Export data button
    const exportDataBtn = document.getElementById('export-data-btn');
    if (exportDataBtn) {
        exportDataBtn.addEventListener('click', function() {
            const userId = localStorage.getItem('current_user_id');
            
            if (!userId) {
                showNotification('User ID tidak ditemukan. Silakan login ulang.', 'error');
                return;
            }
            
            // Show loading notification
            showNotification('Mengekspor data...', 'info');
            
            // Create export options modal
            const exportModal = document.createElement('div');
            exportModal.className = 'modal-overlay active';
            exportModal.innerHTML = `
                <div class="modal-container">
                    <div class="modal-header">
                        <h4 class="modal-title"><i class="fas fa-download"></i> Ekspor Data</h4>
                        <button class="modal-close" id="export-close-btn">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>Pilih format ekspor data:</p>
                        <div class="export-options">
                            <button class="btn-security export-option" id="export-csv-btn">
                                <i class="fas fa-file-csv"></i> CSV
                            </button>
                            <button class="btn-security export-option" id="export-pdf-btn">
                                <i class="fas fa-file-pdf"></i> PDF
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(exportModal);
            
            // Add styles for export options
            const exportStyles = document.createElement('style');
            exportStyles.textContent = `
                .export-options {
                    display: flex;
                    gap: 1rem;
                    margin-top: 1rem;
                }
                
                .export-option {
                    flex: 1;
                    justify-content: center;
                }
            `;
            document.head.appendChild(exportStyles);
            
            // Close button event
            document.getElementById('export-close-btn').addEventListener('click', function() {
                exportModal.remove();
            });
            
            // CSV export button
            document.getElementById('export-csv-btn').addEventListener('click', function() {
                window.location.href = `${window.API_CONFIG ? window.API_CONFIG.BASE_URL : '/api'}/export-csv.php?user_id=${userId}`;
                setTimeout(() => {
                    showNotification('Data berhasil diekspor ke CSV', 'success');
                    exportModal.remove();
                }, 1000);
            });
            
            // PDF export button
            document.getElementById('export-pdf-btn').addEventListener('click', function() {
                fetch(`${window.API_CONFIG ? window.API_CONFIG.BASE_URL : '/api'}/export-pdf.php?user_id=${userId}`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.status === 'success') {
                            showNotification('Data berhasil diekspor ke PDF', 'success');
                            // If you have PDF generation logic in JS, call it here
                            if (typeof window.generatePDF === 'function') {
                                window.generatePDF(data.data, data.user_name, data.summary);
                            }
                        } else {
                            showNotification('Gagal mengekspor data', 'error');
                        }
                        exportModal.remove();
                    })
                    .catch(error => {
                        console.error('Error exporting PDF:', error);
                        showNotification('Gagal mengekspor data', 'error');
                        exportModal.remove();
                    });
            });
        });
    }
}

/**
 * Apply the current theme from localStorage
 */
function applyCurrentTheme() {
    const currentTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(currentTheme);
    
    // Update active button if on settings page
    const themeButtons = document.querySelectorAll('.theme-btn');
    themeButtons.forEach(button => {
        const buttonTheme = button.getAttribute('data-theme');
        button.classList.toggle('active', buttonTheme === currentTheme);
    });
}

/**
 * Apply a specific theme to the application
 * @param {string} theme - The theme name to apply
 */
function applyTheme(theme) {
    // Update document theme
    document.body.setAttribute('data-theme', theme);
    
    // Apply CSS variables
    switch(theme) {
        case 'default':
            document.documentElement.style.setProperty('--primary-color', '#FF7878');
            document.documentElement.style.setProperty('--primary-color-hover', '#e56c6c');
            document.documentElement.style.setProperty('--light-bg', '#f9fafb');
            document.documentElement.style.setProperty('--card-bg', '#ffffff');
            document.documentElement.style.setProperty('--text-color', '#333333');
            document.documentElement.style.setProperty('--light-text', '#6b7280');
            document.documentElement.style.setProperty('--border-color', '#e5e7eb');
            break;
        case 'dark':
            document.documentElement.style.setProperty('--primary-color', '#FF7878');
            document.documentElement.style.setProperty('--primary-color-hover', '#e56c6c');
            document.documentElement.style.setProperty('--light-bg', '#1a1a1a');
            document.documentElement.style.setProperty('--card-bg', '#232323');
            document.documentElement.style.setProperty('--text-color', '#f3f4f6');
            document.documentElement.style.setProperty('--light-text', '#9ca3af');
            document.documentElement.style.setProperty('--border-color', '#374151');
            break;
        case 'blue':
            document.documentElement.style.setProperty('--primary-color', '#3b82f6');
            document.documentElement.style.setProperty('--primary-color-hover', '#2563eb');
            document.documentElement.style.setProperty('--light-bg', '#1e293b');
            document.documentElement.style.setProperty('--card-bg', '#0f172a');
            document.documentElement.style.setProperty('--text-color', '#f3f4f6');
            document.documentElement.style.setProperty('--light-text', '#9ca3af');
            document.documentElement.style.setProperty('--border-color', '#334155');
            break;
    }
    
    // If charts are available, update them
    if (typeof window.applyChartTheme === 'function') {
        window.applyChartTheme(theme);
    }
}

/**
 * Show a notification about theme changes
 * @param {string} theme - The theme that was applied
 */
function showThemeChangedNotification(theme) {
    let themeName = 'Default';
    if (theme === 'dark') themeName = 'Dark';
    if (theme === 'blue') themeName = 'Blue';
    
    showNotification(`Tema diubah ke ${themeName}`, 'success');
}

/**
 * Show a notification to the user
 * @param {string} message - The message to display
 * @param {string} type - The type of notification (success, error, info)
 */
function showNotification(message, type = 'info') {
    // Cek jika sedang dalam proses menampilkan notifikasi untuk mencegah infinite recursion
    if (window.__showingNotification) {
        console.warn('Preventing recursive notification call');
        return;
    }
    
    // Set flag untuk menandai bahwa sedang menampilkan notifikasi
    window.__showingNotification = true;
    
    try {
        // Jika window.showNotification ada dan BUKAN referensi ke fungsi ini sendiri
        if (typeof window.showNotification === 'function' && window.showNotification !== showNotification) {
            window.showNotification(message, type);
            return;
        }
        
        // Jika showToast tersedia
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
            return;
        }
        
        // Fallback - buat toast notification sendiri
        const toastContainer = document.getElementById('toast-container') || createToastContainer();
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        // Set icon based on toast type
        let icon = 'info-circle';
        let title = 'Informasi';
        
        if (type === 'success') {
            icon = 'check-circle';
            title = 'Sukses';
        } else if (type === 'error') {
            icon = 'exclamation-circle';
            title = 'Error';
        } else if (type === 'warning') {
            icon = 'exclamation-triangle';
            title = 'Peringatan';
        }
        
        // Create toast content
        toast.innerHTML = `
            <div class="toast-header">
                <i class="fas fa-${icon} me-2"></i>
                <strong>${title}</strong>
                <button type="button" class="toast-close">&times;</button>
            </div>
            <div class="toast-body">${message}</div>
        `;
        
        // Add to container
        toastContainer.appendChild(toast);
        
        // Show after a small delay (for animation)
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Close button event
        toast.querySelector('.toast-close').addEventListener('click', function() {
            closeToast(toast);
        });
        
        // Auto close after 5 seconds
        setTimeout(() => closeToast(toast), 5000);
    } finally {
        // Reset flag setelah selesai (dengan delay untuk memastikan operasi selesai)
        setTimeout(() => {
            window.__showingNotification = false;
        }, 100);
    }
}

// Helper function untuk menutup toast
function closeToast(toast) {
    toast.classList.remove('show');
    setTimeout(() => {
        toast.remove();
    }, 300);
}

// Helper function untuk membuat toast container
function createToastContainer() {
    const toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.position = 'fixed';
    toastContainer.style.top = '20px';
    toastContainer.style.right = '20px';
    toastContainer.style.zIndex = '1050';
    document.body.appendChild(toastContainer);
    return toastContainer;
}