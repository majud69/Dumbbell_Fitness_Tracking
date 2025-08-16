<?php
/**
 * get-sessions.php - FIXED VERSION
 * 
 * API endpoint to get workout session data by user ID and date range.
 * Modified to query data from both sessions and workout_data tables.
 */

// Disable error reporting for clean JSON output
error_reporting(0);

// Clean output buffering
ob_start();

// Enable CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=UTF-8');

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    ob_end_clean();
    exit();
}

// Include database connection
require_once 'db.php';

// Log request for debugging
error_log("get-sessions.php accessed with params: " . json_encode($_GET));

// Function to return error response
function returnError($message, $code = 400) {
    ob_end_clean();
    http_response_code($code);
    echo json_encode([
        'status' => 'error',
        'message' => $message
    ]);
    exit();
}

// Function to return success response
function returnSuccess($data) {
    ob_end_clean();
    echo json_encode($data);
    exit();
}

// Get parameters
$user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;
$session_id = isset($_GET['session_id']) ? trim($_GET['session_id']) : '';
$start_date = isset($_GET['start_date']) ? trim($_GET['start_date']) : '';
$end_date = isset($_GET['end_date']) ? trim($_GET['end_date']) : '';

// Log parameters for debugging
error_log("DEBUG get-sessions.php: user_id=$user_id, start_date=$start_date, end_date=$end_date");

// Basic parameter validation
if (!$user_id && !$session_id) {
    returnError('Either user_id or session_id parameter is required');
}

// Prepare sessions data
$sessions = [];

// PRIMARY CHANGE: Query workout_data first to find all relevant session IDs
if (!$session_id) {
    // Building a query to get all relevant session_ids from workout_data within the date range
    $date_condition = "";
    if ($start_date && $end_date) {
        $date_condition = " AND DATE(wd.timestamp) BETWEEN ? AND ?";
    }
    
    $get_session_ids_sql = "
        SELECT DISTINCT wd.session_id 
        FROM workout_data wd
        LEFT JOIN sessions s ON wd.session_id = s.session_id
        WHERE (s.user_id = ? OR s.user_id IS NULL)$date_condition
    ";
    
    // Prepare and execute query
    $params = [$user_id];
    $types = "i";
    
    if ($start_date && $end_date) {
        $params[] = $start_date;
        $params[] = $end_date;
        $types .= "ss";
    }
    
    $stmt = $conn->prepare($get_session_ids_sql);
    
    if (!$stmt) {
        error_log("Failed to prepare session_ids query: " . $conn->error);
        returnError("Database error: " . $conn->error, 500);
    }
    
    // Dynamically bind parameters
    $stmt->bind_param($types, ...$params);
    
    if (!$stmt->execute()) {
        error_log("Failed to execute session_ids query: " . $stmt->error);
        returnError("Database error: " . $stmt->error, 500);
    }
    
    $result = $stmt->get_result();
    $session_ids = [];
    
    while ($row = $result->fetch_assoc()) {
        $session_ids[] = $row['session_id'];
    }
    
    error_log("Found session_ids: " . implode(", ", $session_ids));
    
    // If no session IDs found, return empty array
    if (empty($session_ids)) {
        returnSuccess([]);
    }
    
    // Process each session ID
    foreach ($session_ids as $curr_session_id) {
        // Get session data if it exists
        $session_query = "SELECT * FROM sessions WHERE session_id = ?";
        $session_stmt = $conn->prepare($session_query);
        $session_stmt->bind_param("s", $curr_session_id);
        $session_stmt->execute();
        $session_result = $session_stmt->get_result();
        
        if ($session_result->num_rows > 0) {
            // Session exists in sessions table
            $session = $session_result->fetch_assoc();
            
            // Format dates for consistency
            $session['start_time'] = $session['start_time'] ? date('Y-m-d H:i:s', strtotime($session['start_time'])) : null;
            $session['end_time'] = $session['end_time'] ? date('Y-m-d H:i:s', strtotime($session['end_time'])) : null;
            
            // Convert numeric types
            $session['id'] = intval($session['id']);
            $session['user_id'] = intval($session['user_id']);
            $session['dumbbell_weight'] = floatval($session['dumbbell_weight']);
            $session['total_reps'] = intval($session['total_reps']);
            $session['total_sets'] = intval($session['total_sets']);
            $session['total_calories'] = floatval($session['total_calories']);
            $session['avg_form_score'] = floatval($session['avg_form_score']);
            
            // Add compatibility fields
            $session['weight'] = $session['dumbbell_weight'];
            $session['reps'] = $session['total_reps'];
            $session['sets'] = $session['total_sets'];
            $session['calories'] = $session['total_calories'];
            $session['startTime'] = $session['start_time'];
            $session['endTime'] = $session['end_time'];
            $session['status'] = $session['end_time'] ? 'completed' : 'active';
        } else {
            // Session doesn't exist in sessions table, create a placeholder
            $session = [
                'id' => 0,
                'session_id' => $curr_session_id,
                'user_id' => $user_id,
                'dumbbell_weight' => 0,
                'start_time' => null,
                'end_time' => null,
                'total_reps' => 0,
                'total_sets' => 0,
                'total_calories' => 0,
                'avg_form_score' => 0,
                'weight' => 0,
                'reps' => 0,
                'sets' => 0,
                'calories' => 0,
                'startTime' => null,
                'endTime' => null,
                'status' => 'unknown'
            ];
        }
        
        // Get workout data
        $workout_query = "
            SELECT 
                id, session_id, sets, reps, weight, duration, 
                calories, form_score, timestamp
            FROM workout_data 
            WHERE session_id = ?
            ORDER BY timestamp ASC
        ";
        
        $workout_stmt = $conn->prepare($workout_query);
        $workout_stmt->bind_param("s", $curr_session_id);
        $workout_stmt->execute();
        $workout_result = $workout_stmt->get_result();
        
        $workouts = [];
        $session_duration = 0;
        $session_reps = 0;
        $session_sets = 0;
        $session_calories = 0;
        $earliest_timestamp = null;
        $latest_timestamp = null;
        
        while ($workout = $workout_result->fetch_assoc()) {
            // Convert types
            $workout['id'] = intval($workout['id']);
            $workout['sets'] = intval($workout['sets']);
            $workout['reps'] = intval($workout['reps']);
            $workout['weight'] = floatval($workout['weight']);
            $workout['duration'] = intval($workout['duration']);
            $workout['calories'] = floatval($workout['calories']);
            $workout['form_score'] = floatval($workout['form_score']);
            
            // Calculate totals
            $session_sets += $workout['sets'];
            $session_reps += $workout['reps'] * $workout['sets']; // reps per set × sets
            $session_calories += $workout['calories'];
            $session_duration += $workout['duration'];
            
            // Track timestamps
            $timestamp = strtotime($workout['timestamp']);
            if ($earliest_timestamp === null || $timestamp < $earliest_timestamp) {
                $earliest_timestamp = $timestamp;
            }
            if ($latest_timestamp === null || $timestamp > $latest_timestamp) {
                $latest_timestamp = $timestamp;
            }
            
            // Format timestamp
            $workout['timestamp'] = date('Y-m-d H:i:s', $timestamp);
            
            $workouts[] = $workout;
        }
        
        // Update session with workout data
        if (!empty($workouts)) {
            $session['workout_data'] = $workouts;
            $session['duration'] = $session_duration;
            
            // Update fields if we calculated non-zero values
            if ($session_reps > 0) $session['reps'] = $session_reps;
            if ($session_sets > 0) $session['sets'] = $session_sets;
            if ($session_calories > 0) $session['calories'] = $session_calories;
            
            // Use workout timestamp if session timestamps are missing
            if ($earliest_timestamp && !$session['startTime']) {
                $session['startTime'] = date('Y-m-d H:i:s', $earliest_timestamp);
                $session['start_time'] = $session['startTime'];
            }
            if ($latest_timestamp && !$session['endTime']) {
                $session['endTime'] = date('Y-m-d H:i:s', $latest_timestamp);
                $session['end_time'] = $session['endTime'];
            }
            
            // Take weight from first workout if session weight is zero
            if ($session['weight'] == 0 && !empty($workouts)) {
                $session['weight'] = $workouts[0]['weight'];
                $session['dumbbell_weight'] = $workouts[0]['weight'];
            }
        } else {
            $session['workout_data'] = [];
        }
        
        $sessions[] = $session;
    }
} else {
    // Direct session_id query (unchanged from original)
    $query = "
        SELECT 
            s.id,
            s.session_id,
            s.user_id,
            s.dumbbell_weight,
            s.start_time,
            s.end_time,
            s.total_reps,
            s.total_sets,
            s.total_calories,
            s.avg_form_score,
            CASE WHEN s.end_time IS NOT NULL THEN 'completed' ELSE 'active' END as status
        FROM 
            sessions s
        WHERE 
            s.session_id = ?
    ";
    
    $stmt = $conn->prepare($query);
    $stmt->bind_param("s", $session_id);
    
    if (!$stmt->execute()) {
        error_log("Query execution error: " . $stmt->error);
        returnError('Database query failed: ' . $stmt->error, 500);
    }
    
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $session = $result->fetch_assoc();
        
        // Format dates for output consistency
        $session['start_time'] = $session['start_time'] ? date('Y-m-d H:i:s', strtotime($session['start_time'])) : null;
        $session['end_time'] = $session['end_time'] ? date('Y-m-d H:i:s', strtotime($session['end_time'])) : null;
        
        // Convert numeric types
        $session['user_id'] = intval($session['user_id']);
        $session['dumbbell_weight'] = floatval($session['dumbbell_weight']);
        $session['total_reps'] = intval($session['total_reps']);
        $session['total_sets'] = intval($session['total_sets']);
        $session['total_calories'] = floatval($session['total_calories']);
        $session['avg_form_score'] = floatval($session['avg_form_score']);
        
        // Add additional fields for frontend compatibility
        $session['weight'] = $session['dumbbell_weight']; // For compatibility
        $session['reps'] = $session['total_reps'];        // For compatibility
        $session['sets'] = $session['total_sets'];        // For compatibility
        $session['calories'] = $session['total_calories']; // For compatibility
        
        // Format dates for frontend (consistent properties)
        $session['startTime'] = $session['start_time'];
        $session['endTime'] = $session['end_time'];
        
        // Get workout details
        $workout_query = "
            SELECT 
                id,
                session_id,
                sets,
                reps,
                weight,
                duration,
                calories,
                form_score,
                timestamp
            FROM 
                workout_data
            WHERE 
                session_id = ?
            ORDER BY 
                timestamp ASC
        ";
        
        $workout_stmt = $conn->prepare($workout_query);
        $workout_stmt->bind_param("s", $session_id);
        
        if ($workout_stmt->execute()) {
            $workout_result = $workout_stmt->get_result();
            $workouts = [];
            $session_duration = 0;
            
            while ($workout = $workout_result->fetch_assoc()) {
                // Convert numeric types
                $workout['sets'] = intval($workout['sets']);
                $workout['reps'] = intval($workout['reps']);
                $workout['weight'] = floatval($workout['weight']);
                $workout['duration'] = intval($workout['duration']);
                $workout['calories'] = floatval($workout['calories']);
                $workout['form_score'] = floatval($workout['form_score']);
                
                // Calculate totals
                $session_duration += $workout['duration'];
                
                // Format timestamp
                $workout['timestamp'] = date('Y-m-d H:i:s', strtotime($workout['timestamp']));
                
                $workouts[] = $workout;
            }
            
            $session['workout_data'] = $workouts;
            $session['duration'] = $session_duration;
        } else {
            $session['workout_data'] = [];
            $session['duration'] = 0;
        }
        
        $sessions[] = $session;
    }
}

// Log response for debugging
error_log("get-sessions.php returning " . count($sessions) . " sessions");

// Return successful response
returnSuccess($sessions);
?>