/**
 * main.js - Dumbbell Fitness Monitoring System
 * 
 * File utama untuk mengelola aplikasi fitness tracking dengan:
 * - Manajemen sesi dan autentikasi
 * - Navigasi antar halaman
 * - Pengelolaan dan pengiriman data latihan
 * - Integrasi dengan visualisasi chart
 */

// Konfigurasi API
const API_URL = window.API_CONFIG ? window.API_CONFIG.BASE_URL : '/api';

// Event listener saat DOM selesai dimuat
document.addEventListener('DOMContentLoaded', function() {
    console.log('Main app initialized');
    
    // Verifikasi login
    checkLoginStatus();
    
    // Setup navigasi antar halaman
    setupNavigation();
    
    // Setup fungsi form
    setupForms();
    
    // Setup export buttons
    setupExportButtons();
    
    // Setup user info
    updateUserInfo();
    
    // Setup logout button
    setupLogoutButton();
    
    // Atur tema aplikasi
    applyCurrentTheme();
});

/**
 * Cek status login pengguna
 * Redirect ke halaman login jika belum login
 */
function checkLoginStatus() {
    console.log('Checking login status...');
    
    // Periksa keberadaan session ID dan user ID di localStorage
    const sessionId = localStorage.getItem('current_session');
    const userId = localStorage.getItem('current_user_id');
    
    // Debug info
    console.log(`Login check: sessionId=${sessionId}, userId=${userId}`);
    
    // Redirect ke login jika tidak ada data sesi
    // Exception: jika di halaman login.html atau memiliki parameter debug=true
    const isLoginPage = window.location.pathname.includes('login.html');
    const isDebugMode = window.location.search.includes('debug=true');
    
    if (!sessionId && !isLoginPage && !isDebugMode) {
        console.log('No active session, redirecting to login');
        window.location.href = 'login.html';
        return false;
    }
    
    return true;
}

/**
 * Setup navigasi antar halaman
 */
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Dapatkan target halaman
            const targetId = this.getAttribute('data-target');
            if (!targetId) return;
            
            // Hapus kelas active dari semua link
            navLinks.forEach(l => l.classList.remove('active'));
            
            // Tambahkan kelas active pada link yang diklik
            this.classList.add('active');
            
            // Sembunyikan semua halaman
            document.querySelectorAll('.page').forEach(page => {
                page.classList.remove('active');
            });
            
            // Tampilkan halaman target
            const targetPage = document.getElementById(targetId);
            if (targetPage) {
                console.log(`Navigating to page: ${targetId}`);
                targetPage.classList.add('active');
                
                // Reload data jika navigasi ke dashboard
                if (targetId === 'dashboard' && typeof window.refreshCharts === 'function') {
                    console.log('Refreshing dashboard data');
                    window.refreshCharts();
                }
                
                // Reload detail tabel jika navigasi ke halaman detail
                if (targetId === 'details') {
                    console.log('Loading details table');
                    loadDetailsTable();
                }
                
                // Reset scroll position
                window.scrollTo(0, 0);
                
                // Tutup mobile menu jika terbuka
                const sidebar = document.querySelector('.sidebar');
                const overlay = document.getElementById('sidebar-overlay');
                if (sidebar && sidebar.classList.contains('show')) {
                    sidebar.classList.remove('show');
                    if (overlay) overlay.classList.remove('show');
                }
            }
        });
    });
    
    // Aktifkan halaman default
    const defaultPage = sessionStorage.getItem('activePage') || 'dashboard';
    const defaultLink = document.querySelector(`.nav-link[data-target="${defaultPage}"]`);
    if (defaultLink) {
        defaultLink.click();
    } else {
        // Fallback ke dashboard
        const dashboardLink = document.querySelector('.nav-link[data-target="dashboard"]');
        if (dashboardLink) dashboardLink.click();
    }
    
    console.log('Navigation setup complete');
}

/**
 * Setup form untuk tambah data
 */
function setupForms() {
    console.log('Setting up forms');
    
    // Setup form tambah data
    const addWorkoutForm = document.getElementById('add-workout-form');
    if (addWorkoutForm) {
        console.log('Add workout form found, setting up submission handler');
        
        addWorkoutForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleAddWorkoutFormSubmit(this);
        });
        
        // Set default tanggal & waktu
        const dateInput = addWorkoutForm.querySelector('#input-date');
        if (dateInput) {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            
            dateInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
        }
    }
    
    // Setup clear buttons untuk semua form input
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
 * Handle submit form tambah data latihan
 * @param {HTMLFormElement} form - Element form
 */
function handleAddWorkoutFormSubmit(form) {
    console.log('Processing add workout form submission');
    
    // Ambil data dari form
    const formData = new FormData(form);
    
    // Validasi data
    const reps = parseInt(formData.get('reps')) || 0;
    const sets = parseInt(formData.get('sets')) || 0;
    const weight = parseFloat(formData.get('weight')) || 0;
    const duration = parseInt(formData.get('duration')) || 0;
    const workoutDate = formData.get('workout_date') || '';
    
    // Validasi nilai
    if (reps <= 0 || sets <= 0 || weight <= 0 || duration <= 0 || !workoutDate) {
        showNotification('Semua field harus diisi dengan nilai yang valid', 'error');
        return;
    }
    
    // Ambil data sesi dari localStorage
    const sessionId = localStorage.getItem('current_session');
    const userId = localStorage.getItem('current_user_id');
    
    if (!sessionId) {
        showNotification('Tidak ada sesi aktif. Silakan login ulang.', 'error');
        return;
    }
    
    // Siapkan data latihan
    const workoutData = {
        session_id: sessionId,
        user_id: userId ? parseInt(userId) : null,
        reps: reps,
        sets: sets,
        weight: weight,
        duration: duration,
        workout_date: workoutDate
    };
    
    console.log('Sending workout data:', workoutData);
    
    // Tampilkan status loading pada button
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.innerHTML;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
    submitButton.disabled = true;
    
    // Kirim data ke API
    fetch(`${API_URL}/workout-data.php`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(workoutData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('API response:', data);
        
        if (data.status === 'success') {
            // Tampilkan pesan sukses
            showNotification('Data latihan berhasil disimpan', 'success');
            
            // Reset form
            form.reset();
            
            // Set ulang default tanggal
            const dateInput = form.querySelector('#input-date');
            if (dateInput) {
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(now.getMinutes()).padStart(2, '0');
                
                dateInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
            }
            
            // Navigasi ke dashboard
            navigateToPage('dashboard');
            
            // Refresh dashboard data
            if (typeof window.refreshCharts === 'function') {
                window.refreshCharts();
            }
        } else {
            // Tampilkan pesan error
            showNotification(data.message || 'Gagal menyimpan data', 'error');
        }
    })
    .catch(error => {
        console.error('Error saving workout data:', error);
        showNotification(`Error: ${error.message}`, 'error');
    })
    .finally(() => {
        // Reset button state
        submitButton.innerHTML = originalButtonText;
        submitButton.disabled = false;
    });
}

/**
 * Setup tombol export data
 */
function setupExportButtons() {
    // Export CSV
    const exportCSVBtn = document.getElementById('export-csv');
    if (exportCSVBtn) {
        exportCSVBtn.addEventListener('click', handleExportCSV);
    }
    
    // Export PDF
    const exportPDFBtn = document.getElementById('export-pdf');
    if (exportPDFBtn) {
        exportPDFBtn.addEventListener('click', handleExportPDF);
    }
}

/**
 * Handle export ke CSV
 */
function handleExportCSV() {
    const userId = localStorage.getItem('current_user_id');
    if (!userId) {
        showNotification('User ID tidak ditemukan. Silakan login ulang.', 'error');
        return;
    }
    
    // Tampilkan loading notification
    showNotification('Generating CSV...', 'info');
    
    // Buat link download
    const downloadLink = document.createElement('a');
    downloadLink.href = `${API_URL}/export-csv.php?user_id=${userId}`;
    downloadLink.download = 'workout_history.csv';
    downloadLink.style.display = 'none';
    
    // Tambahkan ke body, klik, dan hapus
    document.body.appendChild(downloadLink);
    downloadLink.click();
    
    // Hapus link setelah download dimulai
    setTimeout(() => {
        document.body.removeChild(downloadLink);
        showNotification('CSV berhasil diunduh', 'success');
    }, 1000);
}

/**
 * Handle export ke PDF
 */
function handleExportPDF() {
    const userId = localStorage.getItem('current_user_id');
    if (!userId) {
        showNotification('User ID tidak ditemukan. Silakan login ulang.', 'error');
        return;
    }
    
    // Tampilkan loading notification
    showNotification('Generating PDF...', 'info');
    
    // Request export PDF dari server
    fetch(`${API_URL}/export-pdf.php?user_id=${userId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('PDF data response:', data);
            
            if (data.status === 'success' && data.data && data.data.length > 0) {
                // Generate PDF menggunakan jsPDF jika ada
                if (typeof window.jspdf !== 'undefined' && typeof window.jspdf.jsPDF === 'function') {
                    generatePDF(data.data, data.user_name, data.summary);
                } else {
                    showNotification('jsPDF library tidak tersedia', 'error');
                }
            } else {
                showNotification('Tidak ada data untuk diekspor', 'error');
            }
        })
        .catch(error => {
            console.error('Error generating PDF:', error);
            showNotification(`Error: ${error.message}`, 'error');
        });
}

/**
 * Generate PDF dari data workout
 * @param {Array} data - Data workout untuk PDF
 * @param {String} userName - Nama pengguna
 * @param {Object} summary - Ringkasan statistik
 */
function generatePDF(data, userName = "User", summary = null) {
    const doc = new window.jspdf.jsPDF();
    
    // Tambahkan judul
    doc.setFontSize(20);
    doc.text('Dumbbell Fitness - Workout History', 105, 15, { align: 'center' });
    
    // Tambahkan info pengguna
    doc.setFontSize(12);
    doc.text(`User: ${userName}`, 14, 30);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 38);
    
    // Buat data tabel
    const tableColumn = ["Tanggal", "Latihan", "Berat (kg)", "Set", "Repetisi", "Durasi (menit)", "Kalori (kkal)"];
    const tableRows = [];
    
    // Tambahkan data ke baris
    data.forEach(item => {
        const rowData = [
            item.date,
            item.exercise,
            item.weight,
            item.sets,
            item.reps,
            item.duration,
            Math.round(item.calories)
        ];
        tableRows.push(rowData);
    });
    
    // Buat tabel
    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 45,
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: [255, 120, 120], textColor: [255, 255, 255] }
    });
    
    // Tambahkan statistik ringkasan
    let summaryData = summary;
    if (!summaryData) {
        // Hitung summary jika tidak disediakan
        summaryData = {
            total_workouts: data.length,
            total_sets: 0,
            total_reps: 0,
            total_weight: 0,
            total_duration: 0,
            total_calories: 0
        };
        
        data.forEach(item => {
            summaryData.total_sets += parseInt(item.sets) || 0;
            summaryData.total_reps += parseInt(item.reps) || 0;
            summaryData.total_weight += parseFloat(item.weight) * parseInt(item.reps) * parseInt(item.sets) || 0;
            summaryData.total_duration += parseInt(item.duration) || 0;
            summaryData.total_calories += parseFloat(item.calories) || 0;
        });
    }
    
    // Tambahkan summary statistics
    const finalY = doc.lastAutoTable.finalY || 45;
    doc.setFontSize(14);
    doc.text('Summary Statistics', 14, finalY + 15);
    
    doc.setFontSize(12);
    doc.text(`Total Workouts: ${summaryData.total_workouts}`, 14, finalY + 25);
    doc.text(`Total Sets: ${summaryData.total_sets}`, 14, finalY + 33);
    doc.text(`Total Repetitions: ${summaryData.total_reps}`, 14, finalY + 41);
    doc.text(`Total Weight Lifted: ${Math.round(summaryData.total_weight)} kg`, 14, finalY + 49);
    doc.text(`Total Duration: ${summaryData.total_duration} minutes`, 14, finalY + 57);
    doc.text(`Total Calories Burned: ${Math.round(summaryData.total_calories)} kcal`, 14, finalY + 65);
    
    // Save PDF
    doc.save('workout_history.pdf');
    
    showNotification('PDF berhasil diunduh', 'success');
}

/**
 * Load table detail workout
 * @param {Number} page - Nomor halaman (default: 1)
 */
function loadDetailsTable(page = 1) {
    const userId = localStorage.getItem('current_user_id');
    if (!userId) {
        console.warn('User ID not found, cannot load details');
        return;
    }
    
    console.log(`Loading details table for user ${userId}, page ${page}`);
    
    // Tampilkan loading state
    const tableBody = document.getElementById('details-table-body');
    if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Loading data...</td></tr>';
    }
    
    // Ambil data detail dari API
    fetch(`${API_URL}/get-details.php?user_id=${userId}&page=${page}&limit=10`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(result => {
            console.log('Details data:', result);
            
            if (result.status === 'success' && result.data) {
                // Populate table
                populateDetailsTable(result.data);
                
                // Update pagination
                if (result.pagination) {
                    updatePagination(result.pagination, userId);
                }
            } else {
                // No data or error
                if (tableBody) {
                    tableBody.innerHTML = '<tr><td colspan="8" class="text-center">No workout data found</td></tr>';
                }
            }
        })
        .catch(error => {
            console.error('Error loading details:', error);
            
            if (tableBody) {
                tableBody.innerHTML = `<tr><td colspan="8" class="text-center">Error: ${error.message}</td></tr>`;
            }
        });
}

/**
 * Populate tabel dengan data detail workout
 * @param {Array} details - Data detail workout
 */
function populateDetailsTable(details) {
    const tableBody = document.getElementById('details-table-body');
    if (!tableBody) return;
    
    if (details.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Tidak ada data latihan</td></tr>';
        return;
    }
    
    tableBody.innerHTML = '';
    
    details.forEach(detail => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${detail.date}</td>
            <td>${detail.exercise}</td>
            <td>${detail.weight}</td>
            <td>${detail.sets}</td>
            <td>${detail.reps}</td>
            <td>${detail.duration} min</td>
            <td>${Math.round(detail.calories)} kkal</td>
            <td>
                <button class="btn btn-sm btn-primary edit-btn" data-id="${detail.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger delete-btn" data-id="${detail.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        // Add button event listeners
        const editBtn = row.querySelector('.edit-btn');
        if (editBtn) {
            editBtn.addEventListener('click', function() {
                editWorkout(this.getAttribute('data-id'));
            });
        }
        
        const deleteBtn = row.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', function() {
                deleteWorkout(this.getAttribute('data-id'));
            });
        }
        
        tableBody.appendChild(row);
    });
}

/**
 * Update pagination untuk table detail
 * @param {Object} pagination - Data pagination
 * @param {Number} userId - ID pengguna
 */
function updatePagination(pagination, userId) {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) return;
    
    let paginationHTML = '<nav><ul class="pagination pagination-sm justify-content-center">';
    
    // Previous button
    if (pagination.page > 1) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" data-page="${pagination.page - 1}">Previous</a>
            </li>
        `;
    }
    
    // Page numbers
    for (let i = 1; i <= pagination.pages; i++) {
        const active = i === pagination.page ? 'active' : '';
        paginationHTML += `
            <li class="page-item ${active}">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            </li>
        `;
    }
    
    // Next button
    if (pagination.page < pagination.pages) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" data-page="${pagination.page + 1}">Next</a>
            </li>
        `;
    }
    
    paginationHTML += '</ul></nav>';
    paginationContainer.innerHTML = paginationHTML;
    
    // Add event listeners to pagination links
    const pageLinks = paginationContainer.querySelectorAll('.page-link');
    pageLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const pageNum = parseInt(this.getAttribute('data-page'));
            loadDetailsTable(pageNum);
        });
    });
}

/**
 * Edit data workout
 * @param {String|Number} workoutId - ID workout
 */
function editWorkout(workoutId) {
    if (!workoutId) return;
    
    console.log(`Editing workout ${workoutId}`);
    
    // Tampilkan loading di modal title
    const editModalLabel = document.getElementById('editModalLabel');
    if (editModalLabel) {
        editModalLabel.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    }
    
    // Show modal
    const editModal = new bootstrap.Modal(document.getElementById('editModal'));
    editModal.show();
    
    // Fetch workout data
    fetch(`${API_URL}/workout-data.php?id=${workoutId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(result => {
            console.log('Workout data for edit:', result);
            
            // Reset modal title
            if (editModalLabel) {
                editModalLabel.textContent = 'Edit Data Latihan';
            }
            
            if (result.status === 'success' && result.data) {
                const workout = result.data;
                
                // Populate form fields
                document.getElementById('edit-id').value = workout.id;
                document.getElementById('edit-reps').value = workout.reps;
                document.getElementById('edit-sets').value = workout.sets;
                document.getElementById('edit-weight').value = workout.weight;
                document.getElementById('edit-duration').value = workout.duration;
                document.getElementById('edit-calories').value = workout.calories;
                
                // Setup date if available
                const dateField = document.getElementById('edit-date');
                if (dateField && workout.timestamp) {
                    // Convert timestamp to local datetime-local format
                    const date = new Date(workout.timestamp);
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const hours = String(date.getHours()).padStart(2, '0');
                    const minutes = String(date.getMinutes()).padStart(2, '0');
                    
                    dateField.value = `${year}-${month}-${day}T${hours}:${minutes}`;
                }
                
                // Set up save button
                const saveButton = document.getElementById('save-edit');
                if (saveButton) {
                    // Remove old listeners
                    const newSaveButton = saveButton.cloneNode(true);
                    saveButton.parentNode.replaceChild(newSaveButton, saveButton);
                    
                    // Add new listener
                    newSaveButton.addEventListener('click', function() {
                        saveWorkoutEdit(workout.id);
                    });
                }
            } else {
                // Display error in modal body
                const formContainer = document.getElementById('edit-workout-form');
                if (formContainer) {
                    formContainer.innerHTML = `
                        <div class="alert alert-danger">
                            ${result.message || 'Error loading workout data'}
                        </div>
                    `;
                }
            }
        })
        .catch(error => {
            console.error('Error fetching workout data:', error);
            
            // Display error in modal
            const formContainer = document.getElementById('edit-workout-form');
            if (formContainer) {
                formContainer.innerHTML = `
                    <div class="alert alert-danger">
                        Error fetching workout data: ${error.message}
                    </div>
                `;
            }
            
            // Reset modal title
            if (editModalLabel) {
                editModalLabel.textContent = 'Error';
            }
        });
}

/**
 * Save edited workout data
 * @param {String|Number} workoutId - ID workout
 */
function saveWorkoutEdit(workoutId) {
    if (!workoutId) return;
    
    // Get form data
    const editData = {
        reps: parseInt(document.getElementById('edit-reps').value) || 0,
        sets: parseInt(document.getElementById('edit-sets').value) || 0,
        duration: parseInt(document.getElementById('edit-duration').value) || 0,
        calories: parseFloat(document.getElementById('edit-calories').value) || 0
    };
    
    // Add date if available
    const dateField = document.getElementById('edit-date');
    if (dateField && dateField.value) {
        editData.workout_date = dateField.value;
    }
    
    // Validate data
    if (editData.reps <= 0 || editData.sets <= 0 || editData.duration <= 0) {
        showNotification('Nilai repetisi, set dan durasi harus lebih dari 0', 'error');
        return;
    }
    
    console.log(`Saving edited workout ${workoutId}:`, editData);
    
    // Show loading state
    const saveButton = document.getElementById('save-edit');
    const originalButtonText = saveButton.innerHTML;
    saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    saveButton.disabled = true;
    
    // Send update request
    fetch(`${API_URL}/workout.php?id=${workoutId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(editData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(result => {
        console.log('Update result:', result);
        
        // Reset button
        saveButton.innerHTML = originalButtonText;
        saveButton.disabled = false;
        
        if (result.status === 'success') {
            showNotification('Workout updated successfully', 'success');
            
            // Hide modal
            const editModal = bootstrap.Modal.getInstance(document.getElementById('editModal'));
            editModal.hide();
            
            // Reload data
            loadDetailsTable();
            
            // Refresh dashboard if available
            if (typeof window.refreshCharts === 'function') {
                window.refreshCharts();
            }
        } else {
            showNotification(result.message || 'Error updating workout', 'error');
        }
    })
    .catch(error => {
        console.error('Error saving workout edit:', error);
        
        // Reset button
        saveButton.innerHTML = originalButtonText;
        saveButton.disabled = false;
        
        showNotification(`Error: ${error.message}`, 'error');
    });
}

/**
 * Delete workout data
 * @param {String|Number} workoutId - ID workout
 */
function deleteWorkout(workoutId) {
    if (!workoutId) return;
    
    // Confirm deletion
    if (!confirm('Are you sure you want to delete this workout data?')) {
        return;
    }
    
    console.log(`Deleting workout ${workoutId}`);
    
    // Show loading notification
    showNotification('Deleting workout data...', 'info');
    
    // Try DELETE method
    fetch(`${API_URL}/workout.php?id=${workoutId}`, {
        method: 'DELETE'
    })
    .then(response => {
        // If server doesn't support DELETE, try POST with _method=DELETE
        if (!response.ok && response.status === 405) {
            console.log('Server does not support DELETE, trying POST with _method=DELETE');
            
            const formData = new FormData();
            formData.append('_method', 'DELETE');
            
            // Use POST as fallback
            return fetch(`${API_URL}/workout.php?id=${workoutId}`, {
                method: 'POST',
                body: formData
            });
        }
        return response;
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(result => {
        console.log('Delete result:', result);
        
        if (result.status === 'success') {
            showNotification('Workout deleted successfully', 'success');
            
            // Reload data
            loadDetailsTable();
            
            // Refresh dashboard if available
            if (typeof window.refreshCharts === 'function') {
                window.refreshCharts();
            }
        } else {
            showNotification(result.message || 'Error deleting workout', 'error');
       }
   })
   .catch(error => {
       console.error('Error deleting workout:', error);
       showNotification(`Error: ${error.message}`, 'error');
   });
}

/**
* Update informasi user di UI
*/
function updateUserInfo() {
   const userId = localStorage.getItem('current_user_id');
   if (!userId) {
       console.warn('No user ID found, cannot update user info');
       return;
   }
   
   console.log(`Updating user info for user ${userId}`);
   
   // Fetch user data from API
   fetch(`${API_URL}/get-user.php?user_id=${userId}`)
       .then(response => {
           if (!response.ok) {
               throw new Error(`HTTP error! Status: ${response.status}`);
           }
           return response.json();
       })
       .then(userData => {
           console.log('User data:', userData);
           
           // Update username in navbar
           const userInfoElement = document.querySelector('.user-info');
           if (userInfoElement) {
               userInfoElement.innerHTML = `
                   <i class="fas fa-user-circle me-2"></i>
                   <span id="user-name">Selamat datang, ${userData.name}</span>
                   <a href="#" class="ms-3" id="logout-btn">
                       <i class="fas fa-sign-out-alt fa-lg"></i>
                   </a>
               `;
               
               // Re-attach logout button event
               const logoutBtn = userInfoElement.querySelector('#logout-btn');
               if (logoutBtn) {
                   logoutBtn.addEventListener('click', handleLogout);
               }
           }
           
           // Update profile page if it exists
           updateProfilePage(userData);
       })
       .catch(error => {
           console.error('Error updating user info:', error);
       });
}

/**
* Update data profil pengguna jika halaman profil ada
* @param {Object} userData - Data user
*/
function updateProfilePage(userData) {
   // Check if profile page exists
   const profilePage = document.getElementById('profile');
   if (!profilePage) {
       return;
   }
   
   console.log('Updating profile page with user data');
   
   // Update profile name
   const profileName = profilePage.querySelector('.profile-name');
   if (profileName) {
       profileName.textContent = userData.name || 'User';
   }
   
   // Update profile email/RFID
   const profileEmail = profilePage.querySelector('.profile-email');
   if (profileEmail) {
       profileEmail.textContent = userData.rfid_id || 'RFID: Unknown';
   }
   
   // Update profile stats if available
   if (userData.stats) {
       const stats = userData.stats;
       
       // Update workout count
       const workoutCount = profilePage.querySelector('.profile-stat:nth-child(1) .profile-stat-value');
       if (workoutCount) {
           workoutCount.textContent = stats.total_workouts || 0;
       }
       
       // Update total weight
       const totalWeight = profilePage.querySelector('.profile-stat:nth-child(2) .profile-stat-value');
       if (totalWeight) {
           const weight = stats.total_weight || 0;
           totalWeight.textContent = `${weight.toLocaleString('id-ID')} kg`;
       }
       
       // Update calories
       const totalCalories = profilePage.querySelector('.profile-stat:nth-child(3) .profile-stat-value');
       if (totalCalories) {
           const calories = stats.total_calories || 0;
           totalCalories.textContent = `${calories.toLocaleString('id-ID')} kkal`;
       }
   }
}

/**
* Setup logout button
*/
function setupLogoutButton() {
   // Use event delegation to handle logout button clicks
   document.addEventListener('click', function(event) {
       const logoutBtn = event.target.closest('#logout-btn');
       if (logoutBtn) {
           handleLogout();
       }
   });
}

/**
* Handle logout process
*/
function handleLogout() {
   console.log('Handling logout');
   
   // Confirm logout
   if (!confirm('Apakah Anda yakin ingin keluar?')) {
       return;
   }
   
   // Get current session
   const sessionId = localStorage.getItem('current_session');
   
   // If session exists, end it properly
   if (sessionId) {
       // Prepare end session data
       const endSessionData = {
           session_id: sessionId
       };
       
       // Send request to end session
       fetch(`${API_URL}/end-session.php`, {
           method: 'POST',
           headers: {
               'Content-Type': 'application/json',
           },
           body: JSON.stringify(endSessionData)
       })
       .then(response => response.json())
       .then(data => {
           console.log('Session ended:', data);
       })
       .catch(error => {
           console.error('Error ending session:', error);
       })
       .finally(() => {
           // Always clear session and redirect
           clearSessionAndRedirect();
       });
   } else {
       // No active session, just redirect
       clearSessionAndRedirect();
   }
}

/**
* Clear session data dan redirect ke login
*/
function clearSessionAndRedirect() {
   // Add animation before logout
   const mainElement = document.querySelector('main');
   if (mainElement) {
       mainElement.classList.add('animate__animated', 'animate__fadeOut');
   }
   
   // Clear session data
   localStorage.removeItem('current_session');
   localStorage.removeItem('current_user_id');
   localStorage.removeItem('current_rfid');
   
   // Redirect with slight delay for animation
   setTimeout(() => {
       window.location.href = 'login.html';
   }, 500);
}

/**
* Navigate to specific page
* @param {String} pageId - ID halaman target
*/
function navigateToPage(pageId) {
   const navLink = document.querySelector(`.nav-link[data-target="${pageId}"]`);
   if (navLink) {
       navLink.click();
   }
}

/**
* Apply current theme from localStorage
*/
function applyCurrentTheme() {
   const theme = localStorage.getItem('theme') || 'dark';
   document.body.setAttribute('data-theme', theme);
   
   console.log(`Applied theme: ${theme}`);
}

/**
* Show notification toast
* @param {String} message - Pesan notifikasi
* @param {String} type - Tipe notifikasi: 'success', 'error', 'info', 'warning'
*/
function showNotification(message, type = 'info') {
   // Check if there's a toast container
   let toastContainer = document.getElementById('toast-container');
   
   // Create container if it doesn't exist
   if (!toastContainer) {
       toastContainer = document.createElement('div');
       toastContainer.id = 'toast-container';
       toastContainer.style.position = 'fixed';
       toastContainer.style.top = '20px';
       toastContainer.style.right = '20px';
       toastContainer.style.zIndex = '9999';
       document.body.appendChild(toastContainer);
   }
   
   // Create toast element
   const toast = document.createElement('div');
   toast.className = `toast toast-${type}`;
   toast.style.marginBottom = '10px';
   toast.style.minWidth = '300px';
   
   // Determine icon based on type
   let icon = 'info-circle';
   let title = 'Information';
   
   switch (type) {
       case 'success':
           icon = 'check-circle';
           title = 'Success';
           break;
       case 'error':
           icon = 'exclamation-circle';
           title = 'Error';
           break;
       case 'warning':
           icon = 'exclamation-triangle';
           title = 'Warning';
           break;
   }
   
   // Set toast content
   toast.innerHTML = `
       <div class="toast-header">
           <i class="fas fa-${icon} me-2"></i>
           <strong class="me-auto">${title}</strong>
           <button type="button" class="btn-close" aria-label="Close"></button>
       </div>
       <div class="toast-body">
           ${message}
       </div>
   `;
   
   // Apply some basic styles
   toast.style.backgroundColor = 'var(--card-bg)';
   toast.style.color = 'var(--text-color)';
   toast.style.border = '1px solid var(--border-color)';
   toast.style.borderRadius = '8px';
   toast.style.overflow = 'hidden';
   toast.style.boxShadow = 'var(--shadow)';
   
   // Add border color based on type
   switch (type) {
       case 'success':
           toast.style.borderLeftColor = 'var(--success-color)';
           toast.style.borderLeftWidth = '4px';
           break;
       case 'error':
           toast.style.borderLeftColor = 'var(--danger-color)';
           toast.style.borderLeftWidth = '4px';
           break;
       case 'info':
           toast.style.borderLeftColor = 'var(--info-color)';
           toast.style.borderLeftWidth = '4px';
           break;
       case 'warning':
           toast.style.borderLeftColor = 'var(--warning-color)';
           toast.style.borderLeftWidth = '4px';
           break;
   }
   
   // Add to container
   toastContainer.appendChild(toast);
   
   // Add event listener to close button
   const closeButton = toast.querySelector('.btn-close');
   if (closeButton) {
       closeButton.addEventListener('click', function() {
           toastContainer.removeChild(toast);
       });
   }
   
   // Auto remove after 5 seconds
   setTimeout(() => {
       if (toast.parentNode === toastContainer) {
           toastContainer.removeChild(toast);
       }
   }, 5000);
}

// Expose global functions
window.showNotification = showNotification;
window.navigateToPage = navigateToPage;
window.editWorkout = editWorkout;
window.deleteWorkout = deleteWorkout;
window.loadDetailsTable = loadDetailsTable;