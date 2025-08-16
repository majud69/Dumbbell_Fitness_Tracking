// Const & Variables
const DEBUG_MODE = true; // Set to false to hide debug panel in production
const RFID_CHECK_INTERVAL = 2000; // Check every 2 seconds
const REDIRECT_DELAY = 1500; // 1.5 seconds
const API_URL = window.API_CONFIG ? window.API_CONFIG.BASE_URL : '/api';

// Track if we're already processing an RFID to prevent duplicate processing
let isProcessingRFID = false;
// Track the last processed RFID to prevent re-processing the same card
let lastProcessedRFID = null;

// DOM Elements
const loginStatus = document.getElementById('login-status');
const registrationForm = document.getElementById('registration-form');
const weightForm = document.getElementById('weight-form');
const registerForm = document.getElementById('register-form');
const setWeightForm = document.getElementById('set-weight-form');
const rfidIdInput = document.getElementById('rfid-id');
const debugInfo = document.getElementById('debug-info');
const debugLog = document.getElementById('debug-log');
const loginSpinner = document.querySelector('.login-spinner');
const loginMessage = document.querySelector('.login-message');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('Login page initialized');
    logDebug('Login page initialized');
    
    // Show debug panel if in debug mode
    if (DEBUG_MODE) {
        debugInfo.style.display = 'block';
    }
    
    // Clear any leftover RFID or session data to start fresh
    localStorage.removeItem('current_rfid');
    
    // Reset RFID state on Arduino immediately at page load
    resetArduinoRFID().then(() => {
        logDebug("Arduino RFID state reset on page load");
        
        // Start RFID polling after reset
        logDebug("Starting RFID polling...");
        setInterval(checkRFIDLogin, RFID_CHECK_INTERVAL);
        
        // Start Arduino polling after reset
        logDebug("Starting Arduino RFID polling...");
        setInterval(checkArduinoRFID, RFID_CHECK_INTERVAL);
        
        // Initial check after reset
        checkRFIDLogin();
    });
    
    // Event listeners for forms
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegistration);
    } else {
        logDebug("WARNING: Register form not found in DOM!");
    }
    
    if (setWeightForm) {
        setWeightForm.addEventListener('submit', handleWeightSubmit);
    } else {
        logDebug("WARNING: Weight form not found in DOM!");
    }
    
    // Add debug buttons if in debug mode
    if (DEBUG_MODE) {
        setTimeout(addDebugButtons, 1000);
    }
    
    // Log all elements to debug
    logDebug("Login status element found: " + (loginStatus ? "YES" : "NO"));
    logDebug("Registration form found: " + (registrationForm ? "YES" : "NO"));
    logDebug("Weight form found: " + (weightForm ? "YES" : "NO"));
    logDebug("Register form found: " + (registerForm ? "YES" : "NO"));
    logDebug("Set weight form found: " + (setWeightForm ? "YES" : "NO"));
    logDebug("RFID input found: " + (rfidIdInput ? "YES" : "NO"));
    logDebug("Login spinner found: " + (loginSpinner ? "YES" : "NO"));
    logDebug("Login message found: " + (loginMessage ? "YES" : "NO"));
});

// Function to reset Arduino RFID state
async function resetArduinoRFID() {
    const arduinoIP = window.ARDUINO_IP || localStorage.getItem('arduino_ip');
    
    if (!arduinoIP) {
        logDebug("Arduino IP not configured, cannot reset RFID state");
        return Promise.resolve(); // Return resolved promise for chaining
    }
    
    logDebug("Resetting Arduino RFID state at: " + arduinoIP);
    
    try {
        const response = await fetch(`http://${arduinoIP}/reset-rfid`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            // Optional payload if needed
            body: JSON.stringify({ reset: true })
        });
        
        if (!response.ok) {
            throw new Error('Arduino response not OK: ' + response.status);
        }
        
        const data = await response.json();
        logDebug("Arduino RFID reset response:", data);
        return data;
    } catch (error) {
        console.error("Error resetting Arduino RFID state:", error);
        logDebug("Error resetting Arduino RFID: " + error.message);
        // Still return resolved promise to continue flow
        return Promise.resolve();
    }
}

// Function to check Arduino for RFID data
function checkArduinoRFID() {
    if (isProcessingRFID) {
        logDebug("Skipping Arduino check - already processing an RFID");
        return;
    }
    
    const arduinoIP = window.ARDUINO_IP || localStorage.getItem('arduino_ip');
    
    if (!arduinoIP) {
        logDebug("Arduino IP not configured");
        return;
    }
    
    logDebug("Polling Arduino at: " + arduinoIP);
    
    // Add timestamp to prevent caching issues
    const timestamp = new Date().getTime();
    fetch(`http://${arduinoIP}/status?_=${timestamp}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Arduino response not OK: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            logDebug("Arduino status:", data);
            
            // Implement a stricter validation with timeout check
            const isValidRFID = data.rfid_id && data.rfid_id !== "";
            const isNewRFID = data.rfid_id !== lastProcessedRFID;
            const isSessionActive = data.session_active === true;
            
            // If data includes timestamps, check if the RFID was recently detected
            let isRecentRFID = true;
            if (data.last_rfid_check && data.current_time) {
                const timeSinceDetection = data.current_time - data.last_rfid_check;
                isRecentRFID = timeSinceDetection < 5000; // Only accept RFIDs detected in the last 5 seconds
                
                if (!isRecentRFID && isSessionActive) {
                    logDebug("RFID is stale, resetting Arduino RFID state");
                    resetArduinoRFID();
                    return;
                }
            }
            
            // Only process RFID if it passes all validation checks
            if (isValidRFID && isNewRFID && isRecentRFID) {
                logDebug("RFID detected from Arduino:", data.rfid_id);
                
                // Store RFID in localStorage for processing
                localStorage.setItem('current_rfid', data.rfid_id);
                
                // Save this RFID to prevent duplicate processing
                lastProcessedRFID = data.rfid_id;
                
                // Process the RFID immediately
                checkRFIDLogin();
            } else if (isSessionActive && (!isRecentRFID || !isValidRFID)) {
                // If session is active but RFID is invalid or stale, reset Arduino
                logDebug("Invalid session state detected, resetting Arduino");
                resetArduinoRFID();
            }
        })
        .catch(error => {
            console.error("Error communicating with Arduino:", error);
            logDebug("Arduino communication error: " + error.message);
        });
}

// Function to check for RFID login
function checkRFIDLogin() {
    if (isProcessingRFID) {
        logDebug("Skipping RFID check - already processing an RFID");
        return;
    }
    
    logDebug("Checking for RFID...");
    
    // Get RFID from localStorage
    const rfidId = localStorage.getItem('current_rfid');
    
    if (rfidId) {
        // Set processing flag to prevent duplicate processing
        isProcessingRFID = true;
        
        logDebug("RFID detected: " + rfidId);
        
        // Hide spinner and message while processing
        if (loginSpinner) loginSpinner.style.display = 'none';
        if (loginMessage) loginMessage.innerText = 'Processing RFID...';
        
        // Send request to backend to check RFID
        fetch(`${API_URL}/rfid-scan.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ rfid_id: rfidId })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('HTTP error! status: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            logDebug("RFID scan response:", JSON.stringify(data));
            
            // Remove RFID from localStorage after reading it to prevent duplicate processing
            localStorage.removeItem('current_rfid');
            
            if (data.status === 'success') {
                if (data.user_exists) {
                    // User exists, show weight form
                    logDebug("User found, showing weight form");
                    showWeightForm(rfidId, data.user_data.id);
                } else {
                    // User is new, show registration form
                    logDebug("New user, showing registration form");
                    showRegistrationForm(rfidId);
                }
            } else {
                // Show error
                showStatus(data.message || 'Error checking RFID', 'error');
                
                // Reset processing flag
                isProcessingRFID = false;
                
                // Show spinner again since we're done processing
                if (loginSpinner) loginSpinner.style.display = 'block';
                if (loginMessage) loginMessage.innerText = 'Silakan tapping kartu RFID Anda untuk memulai sesi latihan';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            logDebug("Error communicating with server: " + error.message);
            showStatus('Error komunikasi dengan server. Coba lagi.', 'error');
            
            // Reset processing flag
            isProcessingRFID = false;
            
            // Show spinner again since we're done processing
            if (loginSpinner) loginSpinner.style.display = 'block';
            if (loginMessage) loginMessage.innerText = 'Silakan tapping kartu RFID Anda untuk memulai sesi latihan';
            
            // Remove from localStorage to allow retry
            localStorage.removeItem('current_rfid');
        });
    } else {
        logDebug("Waiting for RFID...");
    }
}

// Show registration form
function showRegistrationForm(rfidId) {
    // Hide spinner, show form
    if (loginSpinner) loginSpinner.style.display = 'none';
    
    if (!registrationForm) {
        logDebug("ERROR: Registration form element not found!");
        showStatus('Error: Registration form not found', 'error');
        isProcessingRFID = false;
        return;
    }
    
    registrationForm.style.display = 'block';
    
    // Set RFID in form
    if (rfidIdInput) {
        rfidIdInput.value = rfidId;
    } else {
        logDebug("ERROR: RFID input element not found!");
    }
}

// Show weight input form
function showWeightForm(rfidId, userId) {
    // Hide spinner, show form
    if (loginSpinner) loginSpinner.style.display = 'none';
    
    if (!weightForm) {
        logDebug("ERROR: Weight form element not found!");
        showStatus('Error: Weight form not found', 'error');
        isProcessingRFID = false;
        return;
    }
    
    weightForm.style.display = 'block';
    
    // Store current user's RFID and user ID for form submission
    weightForm.dataset.rfidId = rfidId;
    weightForm.dataset.userId = userId || ''; // Use empty string if userId is not provided
    
    logDebug("Weight form displayed with userID: " + userId + ", RFID: " + rfidId);
}

// Handle registration form submission
function handleRegistration(e) {
    e.preventDefault();
    
    logDebug("Registration form submitted");
    
    const userName = document.getElementById('user-name');
    const rfidId = document.getElementById('rfid-id');
    
    if (!userName || !rfidId) {
        logDebug("ERROR: Name or RFID input not found");
        showStatus('Form elements not found', 'error');
        return;
    }
    
    const nameValue = userName.value;
    const rfidValue = rfidId.value;
    
    if (!nameValue || !rfidValue) {
        showStatus('Nama tidak boleh kosong', 'error');
        return;
    }

    logDebug("Registering user: " + nameValue + " with RFID: " + rfidValue);
    
    // Send registration data to backend
    fetch(`${API_URL}/register.php`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: nameValue, rfid_id: rfidValue })
    })
    .then(response => response.json())
    .then(data => {
        logDebug("Registration response: " + JSON.stringify(data));
        
        if (data.status === 'success') {
            showStatus('Registrasi berhasil!', 'success');
            
            // Save the newly created user ID
            const userId = data.user_id;
            
            // Move to weight form with the newly created user ID
            if (registrationForm) registrationForm.style.display = 'none';
            showWeightForm(rfidValue, userId);
        } else {
            showStatus(data.message || 'Registrasi gagal', 'error');
            
            // Reset processing flag
            isProcessingRFID = false;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        logDebug("Error during registration: " + error.message);
        showStatus('Error komunikasi dengan server. Coba lagi.', 'error');
        
        // Reset processing flag
        isProcessingRFID = false;
    });
}

// Handle weight form submission
function handleWeightSubmit(e) {
    e.preventDefault();
    
    logDebug("Weight form submitted");
    
    const weightInput = document.getElementById('dumbbell-weight');
    
    if (!weightInput) {
        logDebug("ERROR: Weight input not found!");
        showStatus('Weight input not found', 'error');
        return;
    }
    
    const weight = weightInput.value;
    const rfidId = weightForm.dataset.rfidId;
    const userId = weightForm.dataset.userId;
    
    logDebug("Form values - Weight: " + weight + ", RFID: " + rfidId + ", UserID: " + userId);
    
    if (!weight || weight <= 0) {
        showStatus('Berat harus lebih dari 0', 'error');
        return;
    }
    
    if (!userId) {
        showStatus('User ID tidak ditemukan', 'error');
        return;
    }
    
    logDebug("Starting session for user " + userId + " with weight " + weight + "kg");
    
    // Create unique session ID
    const sessionId = Date.now().toString();
    
    // Send data to backend to start session
    fetch(`${API_URL}/start-session.php`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            session_id: sessionId,
            user_id: userId,
            weight: parseFloat(weight)
        })
    })
    .then(response => response.json())
    .then(data => {
        logDebug("Start session response: " + JSON.stringify(data));
        
        if (data.status === 'success') {
            // Save session_id in localStorage for use in other pages
            localStorage.setItem('current_session', sessionId);
            localStorage.setItem('current_user_id', userId);
            
            // Send data to Arduino to start workout session
            startArduinoSession(sessionId, userId, parseFloat(weight));
            
            // Show success message
            showStatus('Sesi latihan dimulai!', 'success');
            
            // Reset processing flag
            isProcessingRFID = false;
            
            // Redirect to dashboard after a short delay
            setTimeout(() => {
                window.location.href = 'index.html';
            }, REDIRECT_DELAY);
        } else {
            showStatus(data.message || 'Gagal memulai sesi', 'error');
            
            // Reset processing flag
            isProcessingRFID = false;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        logDebug("Error starting session: " + error.message);
        showStatus('Error komunikasi dengan server. Coba lagi.', 'error');
        
        // Reset processing flag
        isProcessingRFID = false;
    });
}

// Send session data to Arduino
function startArduinoSession(sessionId, userId, weight) {
    const arduinoIP = window.ARDUINO_IP || localStorage.getItem('arduino_ip');
    
    if (!arduinoIP) {
        logDebug("Arduino IP not configured, cannot start session on hardware");
        return;
    }
    
    logDebug("Starting workout session on Arduino: " + arduinoIP);
    
    // Create session start payload for Arduino
    const payload = {
        session_id: sessionId,
        user_id: userId,
        weight: weight
    };
    
    // Send to Arduino
    fetch(`http://${arduinoIP}/start-session`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Arduino response not OK: ' + response.status);
        }
        return response.json();
    })
    .then(data => {
        logDebug("Arduino session started successfully:", data);
    })
    .catch(error => {
        console.error("Error starting Arduino session:", error);
        logDebug("Arduino session start error: " + error.message);
        // Even if Arduino fails, continue with web app
    });
}

// Show status message
function showStatus(message, type) {
    logDebug("Showing status: " + message + " (type: " + type + ")");
    
    if (!loginStatus) {
        console.error("Login status element not found!");
        return;
    }
    
    loginStatus.textContent = message;
    loginStatus.className = type;
    loginStatus.style.display = 'block';
}

// Helper to log to debug panel
function logDebug(message, obj) {
    if (!DEBUG_MODE) return;
    
    console.log(message);
    if (obj) console.log(obj);
    
    if (!debugLog) {
        console.error("Debug log element not found!");
        return;
    }
    
    const logEntry = document.createElement('div');
    logEntry.textContent = new Date().toLocaleTimeString() + ': ' + message;
    if (obj) logEntry.textContent += ' ' + JSON.stringify(obj);
    debugLog.appendChild(logEntry);
    
    // Scroll to latest
    debugLog.scrollTop = debugLog.scrollHeight;
}

// Helper to simulate RFID scan (for testing without hardware)
function simulateRFIDScan(rfidId) {
    localStorage.setItem('current_rfid', rfidId);
    logDebug("Simulated RFID scan: " + rfidId);
}

// Debug buttons for demonstration
function addDebugButtons() {
    // Check if buttons are already added
    if (document.querySelector('.debug-buttons')) {
        return;
    }
    
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'debug-buttons mt-3';
    buttonContainer.innerHTML = `
        <button onclick="simulateRFIDScan('587FE953')" class="btn btn-sm btn-secondary me-2">
            Simulate Detected RFID
        </button>
        <button onclick="simulateRFIDScan('5E6F7G8H')" class="btn btn-sm btn-secondary me-2">
            Simulate Other RFID
        </button>
        <button id="test-arduino-btn" class="btn btn-sm btn-info">
            Test Arduino Connection
        </button>
        <button id="reset-rfid-btn" class="btn btn-sm btn-danger">
            Reset RFID State
        </button>
    `;
    
    if (debugInfo) {
        debugInfo.appendChild(buttonContainer);
        
        // Add event listener for Arduino test
        const testBtn = document.getElementById('test-arduino-btn');
        if (testBtn) {
            testBtn.addEventListener('click', testArduinoConnection);
        }
        
        // Add event listener for resetting RFID state
        const resetBtn = document.getElementById('reset-rfid-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', resetRFIDState);
        }
    }
}

// Test Arduino Connection
function testArduinoConnection() {
    const arduinoIP = window.ARDUINO_IP || localStorage.getItem('arduino_ip');
    
    if (!arduinoIP) {
        logDebug("Arduino IP not configured");
        showStatus('Arduino IP not configured', 'error');
        return;
    }
    
    logDebug("Testing connection to Arduino at: " + arduinoIP);
    
    fetch(`http://${arduinoIP}/status`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Arduino response not OK: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            logDebug("Arduino connection test successful:", data);
            showStatus('Arduino connected: ' + JSON.stringify(data), 'success');
        })
        .catch(error => {
            console.error("Arduino connection test failed:", error);
            logDebug("Arduino connection error: " + error.message);
            showStatus('Arduino connection failed: ' + error.message, 'error');
        });
}

// Reset RFID processing state
function resetRFIDState() {
    isProcessingRFID = false;
    lastProcessedRFID = null;
    localStorage.removeItem('current_rfid');
    logDebug("RFID processing state reset");
    
    // Reset Arduino RFID state
    resetArduinoRFID().then(data => {
        showStatus('RFID state reset successful', 'success');
        
        // Show spinner again
        if (loginSpinner) loginSpinner.style.display = 'block';
        if (loginMessage) loginMessage.innerText = 'Silakan tapping kartu RFID Anda untuk memulai sesi latihan';
        
        // Hide forms
        if (registrationForm) registrationForm.style.display = 'none';
        if (weightForm) weightForm.style.display = 'none';
    });
}