<?php
require_once 'api-common.php';

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Include database connection
include 'db.php';

// Handle DELETE method via POST for compatibility
$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'POST' && isset($_POST['_method']) && $_POST['_method'] === 'DELETE') {
    $method = 'DELETE';
}

// Get workout ID from URL parameter
$id = isset($_GET['id']) ? intval($_GET['id']) : 0;

if (!$id) {
    echo json_encode(['status' => 'error', 'message' => 'Workout ID is required']);
    exit();
}

// Handle different HTTP methods
switch ($method) {
    case 'GET':
        // Fetch a single workout entry
        $sql = "SELECT 
                    wd.*, 
                    s.dumbbell_weight as weight,
                    s.user_id 
                FROM workout_data wd
                JOIN sessions s ON wd.session_id = s.session_id
                WHERE wd.id = $id";
                
        $result = $conn->query($sql);
        
        if ($result && $result->num_rows > 0) {
            $workout = $result->fetch_assoc();
            echo json_encode(['status' => 'success', 'data' => $workout]);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Workout not found']);
        }
        break;
        
    case 'POST':
        // Update workout entry
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!$data) {
            echo json_encode(['status' => 'error', 'message' => 'No data provided']);
            exit();
        }
        
        // Extract workout data
        $reps = isset($data['reps']) ? intval($data['reps']) : 0;
        $sets = isset($data['sets']) ? intval($data['sets']) : 0;
        $duration = isset($data['duration']) ? intval($data['duration']) : 0;
        $calories = isset($data['calories']) ? floatval($data['calories']) : 0;
        $workout_date = isset($data['workout_date']) ? $data['workout_date'] : null;
        
        // Prepare SQL parts
        $sql_parts = [];
        if ($reps > 0) $sql_parts[] = "reps = $reps";
        if ($sets > 0) $sql_parts[] = "sets = $sets";
        if ($duration > 0) $sql_parts[] = "duration = $duration";
        if ($calories > 0) $sql_parts[] = "calories = $calories";
        
        // Handle date if provided
        if ($workout_date) {
            $timestamp = date('Y-m-d H:i:s', strtotime($workout_date));
            $sql_parts[] = "timestamp = '$timestamp'";
        }
        
        // If no fields to update, return error
        if (empty($sql_parts)) {
            echo json_encode(['status' => 'error', 'message' => 'No fields to update']);
            exit();
        }
        
        // Build and execute update query
        $sql = "UPDATE workout_data SET " . implode(", ", $sql_parts) . " WHERE id = $id";
                
        if ($conn->query($sql) === TRUE) {
            // Also update session totals
            $session_sql = "SELECT session_id FROM workout_data WHERE id = $id";
            $session_result = $conn->query($session_sql);
            
            if ($session_result && $session_result->num_rows > 0) {
                $session_id = $session_result->fetch_assoc()['session_id'];
                
                // Update session totals based on all workout data
                $update_session = "UPDATE sessions s
                                 SET total_reps = (SELECT SUM(reps) FROM workout_data WHERE session_id = s.session_id),
                                     total_sets = (SELECT SUM(sets) FROM workout_data WHERE session_id = s.session_id),
                                     total_calories = (SELECT SUM(calories) FROM workout_data WHERE session_id = s.session_id),
                                     avg_form_score = (SELECT AVG(form_score) FROM workout_data WHERE session_id = s.session_id)
                                 WHERE session_id = '$session_id'";
                                 
                $conn->query($update_session);
            }
            
            echo json_encode(['status' => 'success', 'message' => 'Workout updated successfully']);
        } else {
            echo json_encode(['status' => 'error', 'message' => $conn->error]);
        }
        break;
        
    case 'DELETE':
        // Log the request for debugging
        error_log("Processing DELETE request for workout ID: $id");
        
        // First get the session_id for later update
        $session_sql = "SELECT session_id FROM workout_data WHERE id = $id";
        error_log("Executing query: $session_sql");
        $session_result = $conn->query($session_sql);
        $session_id = null;
        
        if ($session_result && $session_result->num_rows > 0) {
            $session_id = $session_result->fetch_assoc()['session_id'];
            error_log("Found session_id: $session_id");
        } else {
            error_log("No session_id found or query failed: " . $conn->error);
        }
        
        // Delete workout entry
        $sql = "DELETE FROM workout_data WHERE id = $id";
        error_log("Executing delete query: $sql");
        
        $delete_result = $conn->query($sql);
        
        if ($delete_result) {
            error_log("Delete successful");
            
            // Update session totals if we have the session_id
            if ($session_id) {
                $update_session = "UPDATE sessions s
                                 SET total_reps = COALESCE((SELECT SUM(reps) FROM workout_data WHERE session_id = s.session_id), 0),
                                     total_sets = COALESCE((SELECT SUM(sets) FROM workout_data WHERE session_id = s.session_id), 0),
                                     total_calories = COALESCE((SELECT SUM(calories) FROM workout_data WHERE session_id = s.session_id), 0),
                                     avg_form_score = COALESCE((SELECT AVG(form_score) FROM workout_data WHERE session_id = s.session_id), 0)
                                 WHERE session_id = '$session_id'";
                
                error_log("Executing update session query: $update_session");
                $update_result = $conn->query($update_session);
                
                if ($update_result) {
                    error_log("Session update successful");
                } else {
                    error_log("Session update failed: " . $conn->error);
                }
            }
            
            echo json_encode(['status' => 'success', 'message' => 'Workout deleted successfully']);
        } else {
            error_log("Delete failed: " . $conn->error);
            echo json_encode(['status' => 'error', 'message' => 'Failed to delete workout: ' . $conn->error]);
        }
        break;
        
    default:
        echo json_encode(['status' => 'error', 'message' => 'Unsupported method']);
        break;
}

$conn->close();
?>