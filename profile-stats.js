/**
 * Update profile data with real statistics from backend
 */
function updateProfileStats() {
    const userId = localStorage.getItem('current_user_id');
    if (!userId) return;
    
    fetch(`${API_CONFIG.BASE_URL}/get-user.php?user_id=${userId}`)
        .then(response => response.json())
        .then(data => {
            if (data.status !== 'error') {
                // Update profile name and RFID
                const profileNameElement = document.querySelector('.profile-name');
                const profileEmailElement = document.querySelector('.profile-email');
                
                if (profileNameElement) profileNameElement.textContent = data.name;
                if (profileEmailElement) profileEmailElement.textContent = `RFID: ${data.rfid_id}`;
                
                // Update profile statistics with real data from database
                const stats = data.stats || {};
                
                // Update workout count
                const workoutCountElement = document.querySelector('.profile-stat:nth-child(1) .profile-stat-value');
                if (workoutCountElement) {
                    workoutCountElement.textContent = stats.total_workouts || 0;
                }
                
                // Update total weight (format with comma for thousands)
                const totalWeightElement = document.querySelector('.profile-stat:nth-child(2) .profile-stat-value');
                if (totalWeightElement) {
                    const weight = stats.total_weight || 0;
                    totalWeightElement.textContent = `${weight.toLocaleString('id-ID')} kg`;
                }
                
                // Update total calories
                const totalCaloriesElement = document.querySelector('.profile-stat:nth-child(3) .profile-stat-value');
                if (totalCaloriesElement) {
                    const calories = stats.total_calories || 0;
                    totalCaloriesElement.textContent = `${calories.toLocaleString('id-ID')} kkal`;
                }
                
                console.log('Profile stats updated:', stats);
            }
        })
        .catch(error => {
            console.error('Error updating profile stats:', error);
        });
}

// Update the existing updateUserInfo function to call updateProfileStats
const originalUpdateUserInfo = window.updateUserInfo;
window.updateUserInfo = function() {
    // Call original function
    if (originalUpdateUserInfo) originalUpdateUserInfo();
    
    // Also update profile stats
    updateProfileStats();
};

// Call on page load
document.addEventListener('DOMContentLoaded', function() {
    updateProfileStats();
});