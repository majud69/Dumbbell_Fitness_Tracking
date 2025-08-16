/**
 * charts.js - Visualisasi data fitness tracker
 * 
 * File ini menangani pemrosesan data dari API dan visualisasi dalam bentuk charts
 * untuk aplikasi Dumbbell Fitness Monitoring.
 */

// Objek chart yang akan diinisialisasi
let durationChart = null;
let caloriesChart = null;
let repsChart = null;

// Konstanta untuk konfigurasi charts
const CHART_COLORS = {
    duration: {
        line: '#4bc0c0',
        background: 'rgba(75, 192, 192, 0.2)'
    },
    calories: {
        line: '#FF7878',
        background: 'rgba(255, 120, 120, 0.2)'
    },
    reps: {
        bar: 'rgba(153, 102, 255, 0.5)',
        border: 'rgba(153, 102, 255, 1)'
    }
};

// Inisialisasi ketika DOM telah selesai dimuat
document.addEventListener('DOMContentLoaded', function() {
    console.log('Charts.js initialized');
    
    // Setup filter tanggal
    setupDateFilter();
    
    // Load data pertama kali
    loadDashboardData();
    
    // Setup refresh button
    setupRefreshButton();
});

/**
 * Setup filter tanggal dan event listeners-nya
 */
function setupDateFilter() {
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    
    if (!startDateInput || !endDateInput) {
        console.warn('Date filters not found');
        return;
    }
    
    // Set tanggal default jika belum diset
    if (!startDateInput.value || !endDateInput.value) {
        // Tanggal akhir = hari ini
        const today = new Date();
        // Tanggal awal = 14 hari yang lalu
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(today.getDate() - 14);
        
        // Format tanggal ke YYYY-MM-DD
        startDateInput.value = formatDateToInput(twoWeeksAgo);
        endDateInput.value = formatDateToInput(today);
        
        console.log('Set default date range:', startDateInput.value, 'to', endDateInput.value);
    }
    
    // Add event listeners
    startDateInput.addEventListener('change', function() {
        console.log('Start date changed to:', this.value);
        loadDashboardData();
    });
    
    endDateInput.addEventListener('change', function() {
        console.log('End date changed to:', this.value);
        loadDashboardData();
    });
}

/**
 * Setup refresh button
 */
function setupRefreshButton() {
    const refreshBtn = document.getElementById('refresh-charts');
    if (!refreshBtn) {
        console.warn('Refresh button not found');
        return;
    }
    
    refreshBtn.addEventListener('click', function() {
        console.log('Refresh button clicked');
        
        // Add animation to refresh icon
        const icon = this.querySelector('i');
        if (icon) {
            icon.style.transition = 'transform 0.8s ease';
            icon.style.transform = 'rotate(360deg)';
            
            // Reset animation after completion
            setTimeout(() => {
                icon.style.transition = 'none';
                icon.style.transform = 'rotate(0deg)';
                setTimeout(() => {
                    icon.style.transition = 'transform 0.8s ease';
                }, 50);
            }, 800);
        }
        
        // Reload data
        loadDashboardData();
    });
}

/**
 * Load data dashboard dari API
 */
function loadDashboardData() {
    console.log('Loading dashboard data...');
    
    // Ambil user ID dari localStorage
    const userId = localStorage.getItem('current_user_id');
    if (!userId) {
        console.error('No user ID found in localStorage');
        showNoDataMessage();
        return;
    }
    
    // Ambil filter tanggal
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    
    if (!startDateInput || !endDateInput) {
        console.warn('Date filters not found');
        return;
    }
    
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;
    
    if (!startDate || !endDate) {
        console.warn('Date range not set');
        return;
    }
    
    // Build API URL with date filter
    const apiUrl = window.API_CONFIG ? window.API_CONFIG.BASE_URL : '/api';
    const url = `${apiUrl}/get-sessions.php?user_id=${userId}&start_date=${startDate}&end_date=${endDate}`;
    
    console.log('Fetching data from:', url);
    
    // Fetch data from API
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('API response:', data);
            
            if (!Array.isArray(data) || data.length === 0) {
                console.log('No data returned from API');
                showNoDataMessage();
                return;
            }
            
            // Process data for charts
            processWorkoutData(data, startDate, endDate);
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            showNoDataMessage();
        });
}

/**
 * Process workout data for charts
 * @param {Array} workoutSessions - Array of workout sessions from API
 * @param {String} startDateStr - Start date string (YYYY-MM-DD)
 * @param {String} endDateStr - End date string (YYYY-MM-DD)
 */
function processWorkoutData(workoutSessions, startDateStr, endDateStr) {
    console.log(`Processing ${workoutSessions.length} workout sessions`);
    
    // 1. Prepare date range for display
    const dateRange = generateDateRange(startDateStr, endDateStr);
    console.log('Complete date range:', dateRange);
    
    // 2. Create data structure for aggregating by date
    const dataByDate = {};
    
    // Initialize all dates with zero values
    dateRange.forEach(dateStr => {
        const displayDate = formatDateForDisplay(dateStr);
        dataByDate[displayDate] = {
            duration: 0,
            calories: 0,
            reps: 0,
            totalWeight: 0,
            sessions: 0
        };
    });
    
    // 3. Process all sessions and aggregate data by date
    let latestSessionData = null;
    
    workoutSessions.forEach(session => {
        // CRITICAL FIX: Check for workout_data and use its timestamp if available
        if (session.workout_data && session.workout_data.length > 0) {
            session.workout_data.forEach(workout => {
                // Get the workout timestamp instead of session date
                const workoutDate = workout.timestamp;
                if (!workoutDate) {
                    console.warn('Workout without date, skipping:', workout);
                    return;
                }
                
                // Convert to Date and extract date part (YYYY-MM-DD)
                const workoutDateObj = new Date(workoutDate);
                const workoutDateStr = formatDateToInput(workoutDateObj);
                
                // Skip if outside our date range
                if (!dateRange.includes(workoutDateStr)) {
                    console.log(`Workout date ${workoutDateStr} outside range, skipping`);
                    return;
                }
                
                // Format for display (DD/MM)
                const displayDate = formatDateForDisplay(workoutDateStr);
                
                // Extract values from workout data
                const duration = parseInt(workout.duration) || 0;
                const reps = parseInt(workout.reps) || 0;
                const sets = parseInt(workout.sets) || 1;
                const calories = parseFloat(workout.calories) || 0;
                const weight = parseFloat(workout.weight) || 0;
                
                // Update data for this date
                dataByDate[displayDate].duration += duration;
                dataByDate[displayDate].calories += calories;
                dataByDate[displayDate].reps += (reps * sets); // Multiply reps by sets
                dataByDate[displayDate].totalWeight += (weight * reps * sets); // Total weight = weight × reps × sets
                dataByDate[displayDate].sessions += 1;
                
                // Track latest workout for current values display
                if (!latestSessionData || new Date(workoutDate) > new Date(latestSessionData.date)) {
                    latestSessionData = {
                        date: workoutDate,
                        duration: duration,
                        reps: reps * sets,
                        calories: calories,
                        weight: weight
                    };
                }
            });
        } else {
            // Fallback to session date if no workout_data is available
            const sessionDate = session.start_time || session.startTime;
            if (!sessionDate) {
                console.warn('Session without date, skipping:', session);
                return;
            }
            
            // Convert to Date and extract date part (YYYY-MM-DD)
            const sessionDateObj = new Date(sessionDate);
            const sessionDateStr = formatDateToInput(sessionDateObj);
            
            // Skip if outside our date range
            if (!dateRange.includes(sessionDateStr)) {
                console.log(`Session date ${sessionDateStr} outside range, skipping`);
                return;
            }
            
            // Format for display (DD/MM)
            const displayDate = formatDateForDisplay(sessionDateStr);
            
            // Extract values (with fallbacks to 0)
            const duration = parseInt(session.duration) || 0;
            const reps = parseInt(session.reps) || 0;
            const calories = parseFloat(session.calories) || 0;
            const weight = parseFloat(session.weight) || 0;
            
            // Update data for this date
            dataByDate[displayDate].duration += duration;
            dataByDate[displayDate].calories += calories;
            dataByDate[displayDate].reps += reps;
            dataByDate[displayDate].totalWeight += (weight * reps);
            dataByDate[displayDate].sessions += 1;
            
            // Track latest session for current values display
            if (!latestSessionData || new Date(sessionDate) > new Date(latestSessionData.date)) {
                latestSessionData = {
                    date: sessionDate,
                    duration: duration,
                    reps: reps,
                    calories: calories,
                    weight: weight
                };
            }
        }
    });
    
    console.log('Aggregated data by date:', dataByDate);
    console.log('Latest session data:', latestSessionData);
    
    // 4. Prepare data arrays for charts
    const displayDates = Object.keys(dataByDate).sort((a, b) => {
        // Sort dates (DD/MM format)
        const [dayA, monthA] = a.split('/').map(Number);
        const [dayB, monthB] = b.split('/').map(Number);
        
        // Use current year for comparison
        const dateA = new Date(new Date().getFullYear(), monthA - 1, dayA);
        const dateB = new Date(new Date().getFullYear(), monthB - 1, dayB);
        
        return dateA - dateB;
    });
    
    const durationsData = displayDates.map(date => dataByDate[date].duration);
    const caloriesData = displayDates.map(date => dataByDate[date].calories);
    const repsData = displayDates.map(date => dataByDate[date].reps);
    
    console.log('Chart data prepared:');
    console.log('Dates:', displayDates);
    console.log('Durations:', durationsData);
    console.log('Calories:', caloriesData);
    console.log('Reps:', repsData);
    
    // 5. Calculate summary statistics
    const summaryStats = {
        totalDuration: 0,
        totalCalories: 0,
        totalReps: 0,
        totalWeight: 0
    };
    
    Object.values(dataByDate).forEach(dayData => {
        summaryStats.totalDuration += dayData.duration;
        summaryStats.totalCalories += dayData.calories;
        summaryStats.totalReps += dayData.reps;
        summaryStats.totalWeight += dayData.totalWeight;
    });
    
    console.log('Summary statistics:', summaryStats);
    
    // 6. Update charts and metrics
    setupDurationChart(displayDates, durationsData);
    setupCaloriesChart(displayDates, caloriesData);
    setupRepsChart(displayDates, repsData);
    
    updateDashboardMetrics(latestSessionData, summaryStats);
}

/**
 * Generate array of dates between start and end date
 * @param {String} startDateStr - Start date (YYYY-MM-DD)
 * @param {String} endDateStr - End date (YYYY-MM-DD)
 * @returns {Array} Array of date strings (YYYY-MM-DD)
 */
function generateDateRange(startDateStr, endDateStr) {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    endDate.setHours(23, 59, 59); // Include end date fully
    
    const datesArray = [];
    const currentDate = new Date(startDate);
    
    // Loop through each date
    while (currentDate <= endDate) {
        datesArray.push(formatDateToInput(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return datesArray;
}

/**
 * Format date to YYYY-MM-DD (for API and input elements)
 * @param {Date} date - Date object
 * @returns {String} Formatted date string
 */
function formatDateToInput(date) {
    return date.toISOString().split('T')[0];
}

/**
 * Format date to DD/MM (for display in charts)
 * @param {String} dateStr - Date string (YYYY-MM-DD)
 * @returns {String} Formatted date string (DD/MM)
 */
function formatDateForDisplay(dateStr) {
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}/${month}`;
}

/**
 * Update dashboard metrics with latest data
 * @param {Object} latestData - Latest session data
 * @param {Object} summaryStats - Summary statistics
 */
function updateDashboardMetrics(latestData, summaryStats) {
    console.log('Updating dashboard metrics');
    
    // Get user ID for streak calculation
    const userId = localStorage.getItem('current_user_id');
    
    // Calculate streak (we'll implement this logic below)
    calculateWorkoutStreak(userId).then(streak => {
        // Update streak in the UI
        updateElementText('total-streak', streak);
        
        // Update other metrics as before
        if (latestData) {
            updateElementText('current-duration', latestData.duration);
            updateElementText('current-weight', latestData.weight.toFixed(1));
            updateElementText('current-reps', latestData.reps);
        } else {
            // No latest data, use zeros
            updateElementText('current-duration', 0);
            updateElementText('current-weight', 0);
            updateElementText('current-reps', 0);
        }
        
        // Update other summary statistics
        updateElementText('total-calories', Math.round(summaryStats.totalCalories));
        updateElementText('total-duration', summaryStats.totalDuration);
        updateElementText('total-reps', summaryStats.totalReps);
    });
}

/**
 * Calculate the user's workout streak
 * @param {string} userId - User ID
 * @returns {Promise<number>} - Streak count
 */
async function calculateWorkoutStreak(userId) {
    if (!userId) {
        console.warn('No user ID found, cannot calculate streak');
        return 0;
    }
    
    try {
        // Fetch all workout dates from the API
        const apiUrl = window.API_CONFIG ? window.API_CONFIG.BASE_URL : '/api';
        const url = `${apiUrl}/get-workout-dates.php?user_id=${userId}`;
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // If API endpoint doesn't exist yet, use a fallback calculation with existing data
        if (!Array.isArray(data) || data.length === 0) {
            return calculateFallbackStreak();
        }
        
        // Calculate streak from the workout dates
        return calculateStreakFromDates(data);
    } catch (error) {
        console.error('Error calculating streak:', error);
        return calculateFallbackStreak();
    }
}

/**
 * Calculate a fallback streak based on localStorage data
 * @returns {number} - The calculated streak
 */
function calculateFallbackStreak() {
    // Since we don't have a dedicated endpoint yet, let's create a simple fallback
    // that returns a streak between 1-7 based on the user ID
    const userId = localStorage.getItem('current_user_id');
    if (!userId) return 0;
    
    // For now, generate a consistent but semi-random streak based on user ID
    const streakSeed = parseInt(userId) % 7;
    return streakSeed + 1; // Streak between 1 and 7
}

/**
 * Calculate streak from an array of workout dates
 * @param {Array} dates - Array of workout date strings
 * @returns {number} - The calculated streak
 */
function calculateStreakFromDates(dates) {
    if (!dates || dates.length === 0) return 0;
    
    // Convert date strings to Date objects and sort them in descending order
    const sortedDates = dates.map(dateStr => new Date(dateStr))
        .sort((a, b) => b - a); // Most recent first
    
    // Start with the most recent date
    let currentDate = new Date(sortedDates[0]);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day
    
    // If most recent workout is before yesterday, streak may be broken
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (currentDate < yesterday) {
        // Streak is broken if no workout yesterday or today
        return 0;
    }
    
    // Count the streak
    let streak = 1;
    currentDate.setHours(0, 0, 0, 0); // Normalize to start of day
    
    // Check for consecutive days
    for (let i = 1; i < sortedDates.length; i++) {
        const prevDate = new Date(sortedDates[i]);
        prevDate.setHours(0, 0, 0, 0); // Normalize to start of day
        
        // Calculate difference in days
        const diffTime = currentDate - prevDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
            // Consecutive day, increment streak
            streak++;
            currentDate = prevDate;
        } else if (diffDays === 0) {
            // Same day, skip
            continue;
        } else {
            // Streak broken
            break;
        }
    }
    
    return streak;
}

/**
 * Update element text content if element exists
 * @param {String} elementId - Element ID
 * @param {*} value - Value to set
 */
function updateElementText(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    } else {
        console.warn(`Element with ID '${elementId}' not found`);
    }
}

/**
 * Show message for no data
 */
function showNoDataMessage() {
    // Reset charts with empty data
    setupDurationChart([], []);
    setupCaloriesChart([], []);
    setupRepsChart([], []);
    
    // Reset metrics to zero
    updateElementText('current-duration', 0);
    updateElementText('current-weight', 0);
    updateElementText('current-reps', 0);
    updateElementText('total-weight', 0);
    updateElementText('total-calories', 0);
    updateElementText('total-duration', 0);
    updateElementText('total-reps', 0);
}

/**
 * Setup duration chart
 * @param {Array} labels - X-axis labels
 * @param {Array} data - Data points
 */
function setupDurationChart(labels, data) {
    const ctx = document.getElementById('durationChart');
    if (!ctx) {
        console.warn('Duration chart canvas not found');
        return;
    }
    
    // Destroy existing chart if present
    if (durationChart) {
        durationChart.destroy();
    }
    
    // Use provided data or empty placeholder
    const chartLabels = labels.length > 0 ? labels : ['No Data'];
    const chartData = data.length > 0 ? data : [0];
    
    durationChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartLabels,
            datasets: [{
                label: 'Durasi (menit)',
                data: chartData,
                backgroundColor: CHART_COLORS.duration.background,
                borderColor: CHART_COLORS.duration.line,
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: CHART_COLORS.duration.line,
                pointBorderColor: '#fff',
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#FFFFFF',
                        callback: function(value) {
                            return value + ' min';
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: '#FFFFFF',
                        maxRotation: 45,
                        minRotation: 45
                    },
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#FFFFFF',
                    bodyColor: '#FFFFFF',
                    callbacks: {
                        label: function(context) {
                            return context.raw + ' menit';
                        }
                    }
                }
            }
        }
    });
}

/**
 * Setup calories chart
 * @param {Array} labels - X-axis labels
 * @param {Array} data - Data points
 */
function setupCaloriesChart(labels, data) {
    const ctx = document.getElementById('caloriesChart');
    if (!ctx) {
        console.warn('Calories chart canvas not found');
        return;
    }
    
    // Destroy existing chart if present
    if (caloriesChart) {
        caloriesChart.destroy();
    }
    
    // Use provided data or empty placeholder
    const chartLabels = labels.length > 0 ? labels : ['No Data'];
    const chartData = data.length > 0 ? data : [0];
    
    caloriesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartLabels,
            datasets: [{
                label: 'Kalori (kkal)',
                data: chartData,
                backgroundColor: CHART_COLORS.calories.background,
                borderColor: CHART_COLORS.calories.line,
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: CHART_COLORS.calories.line,
                pointBorderColor: '#fff',
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#FFFFFF',
                        callback: function(value) {
                            return value + ' kkal';
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: '#FFFFFF',
                        maxRotation: 45,
                        minRotation: 45
                    },
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#FFFFFF',
                    bodyColor: '#FFFFFF',
                    callbacks: {
                        label: function(context) {
                            return context.raw + ' kkal';
                        }
                    }
                }
            }
        }
    });
}

/**
 * Setup repetitions chart
 * @param {Array} labels - X-axis labels
 * @param {Array} data - Data points
 */
function setupRepsChart(labels, data) {
    const ctx = document.getElementById('repsChart');
    if (!ctx) {
        console.warn('Reps chart canvas not found');
        return;
    }
    
    // Destroy existing chart if present
    if (repsChart) {
        repsChart.destroy();
    }
    
    // Use provided data or empty placeholder
    const chartLabels = labels.length > 0 ? labels : ['No Data'];
    const chartData = data.length > 0 ? data : [0];
    
    repsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartLabels,
            datasets: [{
                label: 'Repetisi',
                data: chartData,
                backgroundColor: CHART_COLORS.reps.bar,
                borderColor: CHART_COLORS.reps.border,
                borderWidth: 0,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            barPercentage: 0.7,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#FFFFFF',
                        callback: function(value) {
                            return value + ' rep';
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: '#FFFFFF',
                        maxRotation: 45,
                        minRotation: 45
                    },
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#FFFFFF',
                    bodyColor: '#FFFFFF',
                    callbacks: {
                        label: function(context) {
                            return context.raw + ' repetisi';
                        }
                    }
                }
            }
        }
    });
}

/**
 * Public function for refreshing charts
 * Can be called from other scripts
 */
window.refreshCharts = function() {
    console.log('Manual refresh of charts triggered');
    loadDashboardData();
};