/**
 * debug.js - Diagnostic script untuk debugging dashboard
 */

// Jalankan setelah 3 detik (memberikan waktu untuk scripts lain)
setTimeout(function() {
    console.group("======== FITNESS DASHBOARD DIAGNOSTIC ========");
    
    // 1. Periksa status login
    const sessionId = localStorage.getItem('current_session');
    const userId = localStorage.getItem('current_user_id');
    console.log(`Login status: ${sessionId ? 'LOGGED IN' : 'NOT LOGGED IN'}`);
    console.log(`Session ID: ${sessionId || 'NONE'}`);
    console.log(`User ID: ${userId || 'NONE'}`);
    
    // 2. Periksa elemen chart
    const chartElements = ['durationChart', 'caloriesChart', 'repsChart'];
    console.group("Chart Elements");
    chartElements.forEach(id => {
        const element = document.getElementById(id);
        console.log(`${id}: ${element ? 'FOUND' : 'MISSING'}`);
        if (element) {
            console.log(`${id} dimensions: ${element.width}x${element.height}`);
            console.log(`${id} visibility:`, window.getComputedStyle(element).visibility);
            console.log(`${id} display:`, window.getComputedStyle(element).display);
        }
    });
    console.groupEnd();
    
    // 3. Periksa filter tanggal
    const startDate = document.getElementById('start-date');
    const endDate = document.getElementById('end-date');
    console.group("Date Filter");
    console.log(`Start date element: ${startDate ? 'FOUND' : 'MISSING'}`);
    console.log(`End date element: ${endDate ? 'FOUND' : 'MISSING'}`);
    if (startDate && endDate) {
        console.log(`Date range: ${startDate.value || 'EMPTY'} to ${endDate.value || 'EMPTY'}`);
    }
    console.groupEnd();
    
    // 4. Periksa API URL
    const apiBaseUrl = window.API_CONFIG ? window.API_CONFIG.BASE_URL : 'NOT CONFIGURED';
    console.log(`API Base URL: ${apiBaseUrl}`);
    
    // 5. Periksa data di localStorage
    console.group("LocalStorage Data");
    try {
        const workoutSessions = localStorage.getItem('workout_sessions');
        console.log(`workout_sessions: ${workoutSessions ? 'PRESENT' : 'MISSING'}`);
        if (workoutSessions) {
            const parsed = JSON.parse(workoutSessions);
            console.log(`Number of sessions: ${parsed.length}`);
            console.log(`Sample session:`, parsed[0]);
        }
    } catch (e) {
        console.error("Error parsing workout data:", e);
    }
    console.groupEnd();
    
    // 6. Periksa fungsi global
    console.group("Global Functions");
    console.log(`refreshCharts: ${typeof window.refreshCharts === 'function' ? 'AVAILABLE' : 'MISSING'}`);
    console.log(`showNotification: ${typeof window.showNotification === 'function' ? 'AVAILABLE' : 'MISSING'}`);
    console.log(`Chart: ${typeof Chart === 'function' ? 'AVAILABLE' : 'MISSING'}`);
    console.groupEnd();
    
    // 7. Periksa jika dashboard page aktif
    const dashboardPage = document.getElementById('dashboard');
    console.log(`Dashboard page: ${dashboardPage ? 'FOUND' : 'MISSING'}`);
    if (dashboardPage) {
        console.log(`Dashboard active: ${dashboardPage.classList.contains('active') ? 'YES' : 'NO'}`);
    }
    
    // 8. Lakukan test API call
    if (userId && apiBaseUrl) {
        console.group("API Test");
        console.log("Attempting to fetch sessions from API...");
        
        fetch(`${apiBaseUrl}/get-sessions.php?user_id=${userId}`)
            .then(response => {
                console.log(`API response status: ${response.status}`);
                return response.text();
            })
            .then(text => {
                console.log("API raw response:", text.substring(0, 1000) + (text.length > 1000 ? '...' : ''));
                try {
                    const data = JSON.parse(text);
                    console.log("API parsed response:", data);
                    console.log(`Number of sessions returned: ${Array.isArray(data) ? data.length : 'Not an array'}`);
                } catch (e) {
                    console.error("Error parsing API response:", e);
                }
                console.groupEnd();
            })
            .catch(error => {
                console.error("API fetch error:", error);
                console.groupEnd();
            });
    }
    
    console.groupEnd();
    
    // 9. Try to manually load chart data
    if (window.refreshCharts) {
        console.log("Attempting to manually refresh charts...");
        window.refreshCharts();
    }
    
}, 3000);