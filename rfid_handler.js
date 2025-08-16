// File: js/rfid_handler.js

// Configuration
const API_URL = window.API_CONFIG.BASE_URL;
const ARDUINO_URL = 'http://192.168.100.236/prototipe/api'; // IP Address Arduino ESP8266

// Handle RFID scan from Arduino to Backend
async function handleRFIDScan(rfidId) {
    try {
        // Send RFID to backend PHP
        const response = await fetch(`${API_URL}rfid-scan.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ rfid_id: rfidId })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            if (data.user_exists) {
                // User exists, show weight input form
                showWeightForm(data.user_data);
            } else {
                // New user, show registration form
                showRegistrationForm(rfidId);
            }
        }
    } catch (error) {
        console.error('Error handling RFID scan:', error);
        showNotification('Error processing RFID', 'error');
    }
}

// Register new user
async function registerUser(name, rfidId) {
    try {
        const response = await fetch(`${API_URL}register.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: name, rfid_id: rfidId })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            showNotification('Registration successful', 'success');
            // Show weight form after registration
            showWeightForm({ id: data.user_id, name: name });
        } else {
            showNotification(data.message || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Error registering user:', error);
        showNotification('Registration error', 'error');
    }
}

// Start workout session
async function startWorkoutSession(userId, weight) {
    try {
        // Generate session ID
        const sessionId = Date.now().toString();
        
        // Send to Arduino ESP8266 first
        try {
            const arduinoResponse = await fetch(`${ARDUINO_URL}/start-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: sessionId,
                    user_id: userId,
                    weight: weight
                })
            });
            
            if (!arduinoResponse.ok) {
                console.warn('Warning: Could not connect to Arduino device, continuing with session');
            }
        } catch (error) {
            console.warn('Warning: Arduino device not available, continuing with session');
        }
        
        // Store session info in server
        const serverResponse = await fetch(`${API_URL}start-session.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                session_id: sessionId,
                user_id: userId,
                weight: weight
            })
        });
        
        const serverData = await serverResponse.json();
        
        if (serverData.status === 'success') {
            // Store session info in localStorage
            localStorage.setItem('current_session', sessionId);
            localStorage.setItem('current_user_id', userId);
            
            // Redirect to dashboard
            window.location.href = 'index.html';
        } else {
            showNotification('Failed to start session: ' + (serverData.message || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Error starting workout session:', error);
        showNotification('Connection error', 'error');
    }
}

// Periodic update workout data
async function updateWorkoutData(sessionData) {
    try {
        const response = await fetch(`${API_URL}workout-data.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(sessionData)
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            console.log('Workout data updated');
        }
    } catch (error) {
        console.error('Error updating workout data:', error);
    }
}

// End workout session
async function endWorkoutSession(sessionId, stats) {
    try {
        const response = await fetch(`${API_URL}end-session.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                session_id: sessionId,
                total_reps: stats.reps,
                total_duration: stats.duration,
                calories_burned: stats.calories
            })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            showNotification('Workout session completed', 'success');
            // Clear session data
            localStorage.removeItem('current_session');
            localStorage.removeItem('current_user_id');
        }
    } catch (error) {
        console.error('Error ending workout session:', error);
        showNotification('Error ending session', 'error');
    }
}

// Get current workout status from Arduino
async function getWorkoutStatus() {
    try {
        const response = await fetch(`${ARDUINO_URL}/status`);
        const data = await response.json();
        
        if (data.session_active) {
            // Update UI with current data
            updateDashboard(data);
        }
    } catch (error) {
        console.error('Error getting workout status:', error);
    }
}

// Update dashboard with real-time data
function updateDashboard(data) {
    // Update current metrics
    const durationElement = document.getElementById('current-duration');
    const repsElement = document.getElementById('current-reps');
    const pitchElement = document.getElementById('current-pitch');
    
    if (durationElement) durationElement.textContent = data.duration || 0;
    if (repsElement) repsElement.textContent = data.current_reps || 0;
    if (pitchElement) pitchElement.textContent = data.pitch || 0;
    
    // Update charts if available
    if (typeof updateRealtimeChart === 'function') {
        updateRealtimeChart(data);
    }
}

// Initialize real-time monitoring
function initializeRealTimeMonitoring() {
    // Check workout status every 2 seconds
    setInterval(getWorkoutStatus, 2000);
    
    // Update workout data to backend every 5 seconds
    setInterval(() => {
        const sessionId = localStorage.getItem('current_session');
        if (sessionId) {
            // Get current data from dashboard
            const sessionData = {
                session_id: sessionId,
                user_id: localStorage.getItem('current_user_id'),
                reps: parseInt(document.getElementById('current-reps')?.textContent || 0),
                duration: parseInt(document.getElementById('current-duration')?.textContent || 0),
                calories: parseInt(document.getElementById('current-calories')?.textContent || 0)
            };
            
            updateWorkoutData(sessionData);
        }
    }, 5000);
}

// Show weight form dialog
function showWeightForm(userData) {
    // Implementation depends on your UI framework
    // This is a basic example
    const form = `
        <div class="modal">
            <h3>Welcome ${userData.name}!</h3>
            <p>Enter dumbbell weight:</p>
            <input type="number" id="weight-input" min="0.5" max="50" step="0.5" required>
            <button onclick="handleWeightSubmit(${userData.id})">Start Workout</button>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', form);
}

// Show registration form
function showRegistrationForm(rfidId) {
    const form = `
        <div class="modal">
            <h3>New User Registration</h3>
            <p>RFID: ${rfidId}</p>
            <input type="text" id="name-input" placeholder="Enter your name" required>
            <button onclick="handleRegistration('${rfidId}')">Register</button>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', form);
}

// Handle weight submission
function handleWeightSubmit(userId) {
    const weight = document.getElementById('weight-input').value;
    if (weight && weight > 0) {
        startWorkoutSession(userId, parseFloat(weight));
    }
}

// Handle registration
function handleRegistration(rfidId) {
    const name = document.getElementById('name-input').value;
    if (name) {
        registerUser(name, rfidId);
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the dashboard page
    if (window.location.pathname.includes('index.html')) {
        initializeRealTimeMonitoring();
    }
});

// Export functions for use in other modules
window.rfidHandler = {
    handleRFIDScan,
    registerUser,
    startWorkoutSession,
    updateWorkoutData,
    endWorkoutSession,
    getWorkoutStatus
};