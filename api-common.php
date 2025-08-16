<?php
/**
 * Common API Functions - Dumbbell Fitness
 * 
 * Centralized CORS handling, error responses, and utility functions
 * for all API endpoints.
 */

// Matikan pesan error yang bisa merusak output JSON
error_reporting(0);

// Mulai output buffering di awal
ob_start();

// Enable CORS for all endpoints
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Set default content type to JSON
header('Content-Type: application/json; charset=UTF-8');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    // Bersihkan buffer sebelum exit
    ob_end_clean();
    exit();
}

// Standardized response function for success
function sendSuccess($data = null, $message = 'Success') {
    // Bersihkan buffer sebelum output
    ob_end_clean();
    
    $response = [
        'status' => 'success',
        'message' => $message
    ];
    
    if ($data !== null) {
        $response['data'] = $data;
    }
    
    // Set header ulang untuk memastikan
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode($response);
    exit();
}

// Standardized response function for errors
function sendError($message = 'An error occurred', $code = 400) {
    // Bersihkan buffer sebelum output
    ob_end_clean();
    
    http_response_code($code);
    
    // Set header ulang untuk memastikan
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode([
        'status' => 'error',
        'message' => $message
    ]);
    exit();
}

// Common validation function for required parameters
function validateRequiredParams($requiredParams, $data) {
    $missing = [];
    foreach ($requiredParams as $param) {
        if (!isset($data->$param) || (is_string($data->$param) && trim($data->$param) === '')) {
            $missing[] = $param;
        }
    }
    
    if (!empty($missing)) {
        sendError('Missing required parameters: ' . implode(', ', $missing));
        return false;
    }
    
    return true;
}

// Global debug logging function
function logDebug($message, $data = null) {
    $logMessage = date('Y-m-d H:i:s') . " - " . $message;
    
    if ($data !== null) {
        $logMessage .= " - " . json_encode($data);
    }
    
    error_log($logMessage);
}

// Sanitize input to prevent SQL injection
function sanitizeInput($conn, $input) {
    if (is_array($input)) {
        return array_map(function($item) use ($conn) {
            return sanitizeInput($conn, $item);
        }, $input);
    }
    
    return $conn->real_escape_string($input);
}

// Generate standardized error response for DB errors
function handleDbError($conn, $operation = 'database operation') {
    logDebug("Database error during $operation: " . $conn->error);
    sendError("Failed to $operation: " . $conn->error);
}

// Fungsi untuk mengirim JSON dengan aman dari buffer
function sendJsonResponse($data) {
    // Bersihkan buffer sebelum output
    ob_end_clean();
    
    // Mulai buffer baru untuk keamanan
    ob_start();
    
    // Set header
    header('Content-Type: application/json; charset=UTF-8');
    
    // Kirim data JSON
    echo json_encode($data);
    
    // Flush buffer terakhir dan selesai
    ob_end_flush();
    exit();
}

// Mulai buffer baru untuk file yang menggunakan api-common
ob_start();
?>