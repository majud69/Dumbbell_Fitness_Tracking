/**
 * Forms - Dumbbell Fitness
 * 
 * Centralized form handling for all forms in the application.
 * Handles styling, validation, and submission.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize form enhancements
    enhanceAddDataForm();
    
    // Set up clear buttons on all forms
    setupClearButtons();
    
    // Set default dates and times where applicable
    setDefaultDates();
    
    console.log('Form enhancements initialized');
});

/**
 * Enhance the Add Data form with styling and functionality
 */
function enhanceAddDataForm() {
    // Get form container
    const addDataPage = document.getElementById('add-data');
    if (!addDataPage) {
        console.warn('Add data page not found');
        return;
    }
    
    const formContainer = addDataPage.querySelector('.content-card');
    if (!formContainer) {
        console.warn('Form container not found in add data page');
        return;
    }
    
    // Check if form has already been enhanced
    if (formContainer.getAttribute('data-enhanced') === 'true') {
        console.log('Form already enhanced, skipping');
        return;
    }
    
    formContainer.setAttribute('data-enhanced', 'true');
    const newFormHTML = `
        <form id="add-workout-form">
            <div class="form-row">
                <div class="form-input-container">
                    <label for="input-reps" class="form-label">Jumlah Repetisi</label>
                    <div class="input-with-icon">
                        <i class="fas fa-redo input-icon"></i>
                        <input type="number" 
                               id="input-reps" 
                               name="reps"
                               class="dark-input" 
                               placeholder="Masukkan jumlah repetisi" 
                               min="1" 
                               required>
                        <button type="button" class="clear-btn"><i class="fas fa-times"></i></button>
                    </div>
                </div>
                <div class="form-input-container">
                    <label for="input-sets" class="form-label">Jumlah Set</label>
                    <div class="input-with-icon">
                        <i class="fas fa-layer-group input-icon"></i>
                        <input type="number" 
                               id="input-sets" 
                               name="sets"
                               class="dark-input" 
                               placeholder="Masukkan jumlah set" 
                               min="1" 
                               value="1" 
                               required>
                        <button type="button" class="clear-btn"><i class="fas fa-times"></i></button>
                    </div>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-input-container">
                    <label for="input-weight" class="form-label">Berat (kg)</label>
                    <div class="input-with-icon">
                        <i class="fas fa-weight-hanging input-icon"></i>
                        <input type="number" 
                               id="input-weight" 
                               name="weight"
                               class="dark-input" 
                               placeholder="Masukkan berat (kg)" 
                               min="0" 
                               step="0.5" 
                               required>
                        <button type="button" class="clear-btn"><i class="fas fa-times"></i></button>
                    </div>
                </div>
                <div class="form-input-container">
                    <label for="input-duration" class="form-label">Durasi (menit)</label>
                    <div class="input-with-icon">
                        <i class="fas fa-clock input-icon"></i>
                        <input type="number" 
                               id="input-duration" 
                               name="duration"
                               class="dark-input" 
                               placeholder="Masukkan durasi (menit)" 
                               min="1" 
                               required>
                        <button type="button" class="clear-btn"><i class="fas fa-times"></i></button>
                    </div>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-input-container">
                    <label for="input-date" class="form-label">Tanggal dan Waktu</label>
                    <div class="input-with-icon">
                        <i class="fas fa-calendar-alt input-icon"></i>
                        <input type="datetime-local" 
                               id="input-date" 
                               name="workout_date"
                               class="dark-input" 
                               required>
                        <button type="button" class="clear-btn"><i class="fas fa-times"></i></button>
                    </div>
                </div>
            </div>
            
            <div class="form-actions">
                <button type="submit" class="btn-save">
                    <i class="fas fa-save"></i> Simpan Data
                </button>
            </div>
        </form>
    `;
    
    // Update the form
    formContainer.innerHTML = newFormHTML;
    
    // Set up form submission handler
    const form = document.getElementById('add-workout-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form values
            const reps = parseInt(document.getElementById('input-reps').value) || 0;
            const sets = parseInt(document.getElementById('input-sets').value) || 0;
            const weight = parseFloat(document.getElementById('input-weight').value) || 0;
            const duration = parseInt(document.getElementById('input-duration').value) || 0;
            const workoutDate = document.getElementById('input-date').value || '';
            
            // Validation
            if (!reps || !sets || !weight || !duration || !workoutDate) {
                showNotification('Semua field harus diisi. Pastikan nilai berat (kg) diisi dengan benar.', 'error');
                return;
            }
            
            // Get session data
            const sessionId = localStorage.getItem('current_session');
            const userId = localStorage.getItem('current_user_id');
            
            if (!sessionId || !userId) {
                showNotification('Session tidak ditemukan, silakan login ulang', 'error');
                return;
            }
            
            // Prepare workout data with explicit weight value from form
            // PENTING: Memastikan nilai weight dari form manual digunakan, bukan dari sesi
            const workoutData = {
                session_id: sessionId,
                user_id: parseInt(userId),
                reps: reps,
                sets: sets,
                weight: weight, // Weight dari form Tambah Data, bukan dari sesi login
                duration: duration,
                workout_date: workoutDate
            };
            
            console.log('Sending workout data:', workoutData);
            
            // Show loading on button
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
            submitBtn.disabled = true;
            
            // TAMBAHAN: Disable tombol selama proses untuk mencegah duplikasi
            document.querySelectorAll('button').forEach(btn => {
                btn.disabled = true;
            });
            
            // Send data to server with improved error handling
            fetch(`${window.API_CONFIG ? window.API_CONFIG.BASE_URL : '/api'}/workout-data.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(workoutData)
            })
            .then(response => {
                // First get the response as text to debug any issues
                return response.text().then(text => {
                    console.log('Raw server response:', text);
                    
                    try {
                        // Try to parse as JSON
                        return JSON.parse(text);
                    } catch (e) {
                        console.error('Error parsing JSON response:', e);
                        console.error('Raw response:', text);
                        throw new Error('Server returned invalid JSON. See console for details.');
                    }
                });
            })
            .then(data => {
                console.log('Parsed response data:', data);
                
                if (data.status === 'success') {
                    // Show success message
                    showNotification('Data berhasil disimpan', 'success');
                    
                    // Reset form
                    form.reset();
                    
                    // Set default date
                    setDefaultDates();
                    
                    // Reset button
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                    
                    // TAMBAHAN: Enable kembali semua tombol
                    document.querySelectorAll('button').forEach(btn => {
                        btn.disabled = false;
                    });
                    
                    // Navigate to dashboard
                    const dashboardLink = document.querySelector('.nav-link[data-target="dashboard"]');
                    if (dashboardLink) {
                        dashboardLink.click();
                    }
                    
                    // Refresh charts if needed
                    if (typeof window.refreshCharts === 'function') {
                        window.refreshCharts();
                    }
                } else {
                    // Show error
                    showNotification(data.message || 'Gagal menyimpan data', 'error');
                    
                    // Reset button
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                    
                    // TAMBAHAN: Enable kembali semua tombol
                    document.querySelectorAll('button').forEach(btn => {
                        btn.disabled = false;
                    });
                }
            })
            .catch(error => {
                console.error('Error saving data:', error);
                showNotification('Error: ' + error.message, 'error');
                
                // Reset button
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                
                // TAMBAHAN: Enable kembali semua tombol
                document.querySelectorAll('button').forEach(btn => {
                    btn.disabled = false;
                });
            });
        });
    }
}

/**
 * Set up clear buttons for form inputs
 */
function setupClearButtons() {
    const clearButtons = document.querySelectorAll('.clear-btn');
    
    clearButtons.forEach(button => {
        button.addEventListener('click', function() {
            const input = this.previousElementSibling;
            if (input) {
                input.value = '';
                input.focus();
            }
        });
    });
}

/**
 * Set default dates on date inputs
 */
function setDefaultDates() {
    // Set default date time on the add workout form
    const dateInput = document.getElementById('input-date');
    if (dateInput) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        
        const formattedDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
        dateInput.value = formattedDateTime;
    }
    
    // Set default dates on date range pickers if they exist
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    
    if (startDateInput && endDateInput) {
        const today = new Date();
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(today.getDate() - 14);
        
        startDateInput.valueAsDate = twoWeeksAgo;
        endDateInput.valueAsDate = today;
    }
}

/**
 * Show a notification to the user
 * @param {string} message - The message to display
 * @param {string} type - The type of notification (success, error, info)
 */
function showNotification(message, type = 'info') {
    // Prevent recursive calls
    if (window.__showingNotification) {
        console.warn('Preventing recursive notification call');
        return;
    }
    
    window.__showingNotification = true;
    
    try {
        // Use existing showNotification function if available and not this one
        if (typeof window.showNotification === 'function' && window.showNotification !== showNotification) {
            window.showNotification(message, type);
            return;
        }
        
        // Use showToast if available
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
            return;
        }
        
        // Fallback - create our own toast notification
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
        // Reset notification flag with slight delay
        setTimeout(() => {
            window.__showingNotification = false;
        }, 100);
    }
}

/**
 * Close a toast notification
 * @param {HTMLElement} toast - The toast element to close
 */
function closeToast(toast) {
    toast.classList.remove('show');
    setTimeout(() => {
        toast.remove();
    }, 300);
}

/**
 * Create a toast container if it doesn't exist
 * @returns {HTMLElement} The toast container element
 */
function createToastContainer() {
    const toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    
    // Add basic styling
    toastContainer.style.position = 'fixed';
    toastContainer.style.top = '20px';
    toastContainer.style.right = '20px';
    toastContainer.style.zIndex = '1050';
    
    document.body.appendChild(toastContainer);
    
    // Add toast styling if needed
    if (!document.getElementById('toast-styles')) {
        const toastStyles = document.createElement('style');
        toastStyles.id = 'toast-styles';
        toastStyles.textContent = `
            #toast-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1050;
            }
            
            .toast {
                min-width: 300px;
                background-color: #232323;
                color: #f3f4f6;
                border-radius: 8px;
                margin-bottom: 15px;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                overflow: hidden;
                transform: translateX(100%);
                opacity: 0;
                transition: all 0.3s ease;
            }
            
            .toast.show {
                transform: translateX(0);
                opacity: 1;
            }
            
            .toast-header {
                display: flex;
                align-items: center;
                padding: 10px 15px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                background-color: rgba(0, 0, 0, 0.1);
            }
            
            .toast-header strong {
                margin-right: auto;
            }
            
            .toast-close {
                background: none;
                border: none;
                color: #9ca3af;
                font-size: 1.25rem;
                cursor: pointer;
                transition: color 0.3s ease;
            }
            
            .toast-close:hover {
                color: #f3f4f6;
            }
            
            .toast-body {
                padding: 15px;
            }
            
            .toast-success {
                border-left: 4px solid #10b981;
            }
            
            .toast-error {
                border-left: 4px solid #ef4444;
            }
            
            .toast-info {
                border-left: 4px solid #3b82f6;
            }
            
            .toast-warning {
                border-left: 4px solid #f59e0b;
            }
        `;
        
        document.head.appendChild(toastStyles);
    }
    
    return toastContainer;
}