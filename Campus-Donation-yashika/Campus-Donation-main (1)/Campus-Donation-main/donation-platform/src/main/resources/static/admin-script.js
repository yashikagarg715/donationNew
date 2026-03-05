// Global API Base (consistent across all)
const API_BASE = 'http://localhost:8080';

// =========================================================================
//                             HELPER FUNCTIONS (Compliance & Utilities)
// =========================================================================

/**
 * Replaces alert() behavior by displaying messages in a dedicated area.
 * @param {string} type 'success', 'error', or 'warning'
 * @param {string} message The text to display
 */
function displayModalMessage(type, message) {
    const messageArea = document.getElementById('globalMessageArea') || document.getElementById('loginResult');
    const colorClasses = {
        success: 'bg-green-100 border-green-400 text-green-700',
        error: 'bg-red-100 border-red-400 text-red-700',
        warning: 'bg-yellow-100 border-yellow-400 text-yellow-700'
    };
    const symbol = type === 'success' ? '✅' : type === 'error' ? '❌' : '⚠️';

    if (messageArea) {
        messageArea.innerHTML = `<div class="p-4 border-l-4 ${colorClasses[type]} rounded-md mb-4" role="alert">
            <p class="font-bold">${symbol} ${type.toUpperCase()}</p>
            <p>${message}</p>
        </div>`;
    }
    console.log(`[MODAL-${type.toUpperCase()}] ${message}`);
}

/**
 * Replaces confirm() logic. Assumes YES in this environment for continuous flow.
 * @param {string} message The confirmation question
 * @returns {boolean} Always true in this environment.
 */
function showCustomConfirm(message) {
    displayModalMessage('warning', `Confirmation required: ${message}. Proceeding automatically for testing.`);
    console.warn(`[CONFIRMATION MOCK] Assuming YES for action: ${message}`);
    return true;
}

// Shared Logout Function
function logout() {
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    console.log('Logged out');
    window.location.href = '/index.html';
}

/**
 * Shared Utility: API Fetch Helper (Corrected Version)
 * Fixes the "body stream already read" error by cloning the response.
 */
async function apiFetch(url, options = {}) {
    try {
        const response = await fetch(url, options);

        // Check for 204 No Content
        if (response.status === 204) {
            return { message: 'Action successful (No Content).' };
        }

        // Clone the response to allow reading the body multiple times
        const clonedResponse = response.clone();

        let data;
        try {
            // First attempt: read as JSON
            data = await response.json();
        } catch (e) {
            // If JSON parsing fails, fall back to plain text
            data = { message: await clonedResponse.text() || 'Action successful.' };
        }

        if (response.ok) {
            return data;
        } else {
            let errorMessage = data.message || `Request failed with status: ${response.status} (${response.statusText})`;
            throw new Error(errorMessage);
        }

    } catch (error) {
        console.error('API Network or Logic Error:', error);
        throw new Error(error.message || 'Network error. Please check your connection or server status.');
    }
}


// =========================================================================
//                             ADMIN DASHBOARD FUNCTIONS
// =========================================================================

/**
 * Fetches and displays donations that are available (status 'LISTED') and not yet requested.
 */
async function fetchAvailableDonationsForAdmin() {
    const container = document.getElementById('availableDonationsContainer');
    if (!container) return;

    container.innerHTML = '<p class="text-center text-gray-500">⏳ Loading available donations...</p>';

    try {
        const donations = await apiFetch(`${API_BASE}/donations/available`);

        container.innerHTML = '';
        if (Array.isArray(donations) && donations.length === 0) {
            container.innerHTML = '<p class="text-center text-green-600 p-4">✅ All donations are either requested or processed.</p>';
        } else if (Array.isArray(donations)) {
            donations.forEach(donation => {
                const item = document.createElement('div');
                item.className = 'p-3 bg-white border-b border-gray-100 hover:bg-gray-50 flex flex-col';
                item.innerHTML = `
                    <p class="font-semibold text-gray-900">${donation.itemName} (Qty: ${donation.quantity})</p>
                    <p class="text-xs text-gray-600">ID: ${donation.id} | Donor: ${donation.donorEmail}</p>
                    <p class="text-xs text-gray-500 mt-1">${donation.description}</p>
                `;
                container.appendChild(item);
            });
        }
    } catch (error) {
        console.error('Error fetching available donations:', error);
        container.innerHTML = `<div class="p-4 text-center text-red-500">❌ Error loading available donations: ${error.message}</div>`;
    }
}


/**
 * Fetches all pending donation requests and renders them on the admin dashboard.
 */
async function fetchPendingRequests() {
    const container = document.getElementById('pendingRequestsContainer');
    if (!container) return;

    container.innerHTML = '<p class="text-center text-gray-500">⏳ Loading pending requests...</p>';

    try {
        const requests = await apiFetch(`${API_BASE}/admin/pending-donations`);

        container.innerHTML = '';
        if (Array.isArray(requests) && requests.length === 0) {
            container.innerHTML = '<p class="text-center text-green-600 p-4">✅ No pending donation requests.</p>';
        } else if (Array.isArray(requests)) {
            requests.forEach(request => {
                const item = document.createElement('div');
                item.className = 'flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white border border-gray-200 rounded-lg shadow-sm mb-4 transition duration-200 hover:shadow-md';
                item.innerHTML = `
                    <div class="mb-3 sm:mb-0">
                        <p class="font-semibold text-gray-900">${request.itemName} (Qty: ${request.quantity})</p>
                        <p class="text-sm text-gray-600">ID: ${request.id} | Donor: ${request.donorEmail || 'N/A'}</p>
                        <p class="text-xs text-gray-500 mt-1">Requested by NGO: ${request.ngoEmail || 'N/A'}</p>
                    </div>
                    <div class="flex space-x-2">
                        <button class="px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                            onclick="handleRequest(${request.id}, 'APPROVED')">
                            Approve
                        </button>
                        <button class="px-3 py-1 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                            onclick="handleRequest(${request.id}, 'REJECTED')">
                            Reject
                        </button>
                    </div>
                `;
                container.appendChild(item);
            });
        }
    } catch (error) {
        console.error('Error fetching requests:', error);
        container.innerHTML = `<div class="p-4 text-center text-red-500">❌ Error loading pending requests: ${error.message}</div>`;
    }
}

/**
 * Sends a PATCH request to update the donation status (APPROVED/REJECTED).
 * @param {number} donationId
 * @param {string} status 'APPROVED' or 'REJECTED'
 */
async function handleRequest(donationId, status) {
    if (!showCustomConfirm(`Are you sure you want to ${status.toLowerCase()} donation ID ${donationId}?`)) {
        return;
    }

    try {
        const result = await apiFetch(`${API_BASE}/admin/donations/${donationId}/status?status=${status}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' }
        });

        console.log("Backend response for status update:", result);

        displayModalMessage('success', result.message || 'Status updated successfully.');
        fetchPendingRequests();
        fetchDonationHistory();
        fetchAvailableDonationsForAdmin();
    } catch (error) {
        console.error('Error handling request:', error);
        displayModalMessage('error', `Failed to update request: ${error.message}`);
    }
}

/**
 * Fetches and displays the history of all processed donations (approved or rejected).
 */
async function fetchDonationHistory() {
    const container = document.getElementById('donationHistoryContainer');
    if (!container) return;

    container.innerHTML = '<p class="text-center text-gray-500">⏳ Loading donation history...</p>';

    try {
        const history = await apiFetch(`${API_BASE}/admin/donation-history`);

        container.innerHTML = '';
        if (Array.isArray(history) && history.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-500 p-4">No history found yet.</p>';
        } else if (Array.isArray(history)) {
            history.forEach(item => {
                const statusClass = item.status === 'APPROVED' ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';

                const historyItem = document.createElement('div');
                historyItem.className = 'p-4 flex flex-col md:flex-row justify-between items-start md:items-center hover:bg-gray-50 transition duration-150 border-b border-gray-100 last:border-b-0';
                historyItem.innerHTML = `
                    <div class="mb-2 md:mb-0">
                        <span class="font-bold text-gray-800">${item.itemName}</span>
                        <span class="text-sm text-gray-600">(Qty: ${item.quantity})</span>
                    </div>
                    <div class="text-right text-sm">
                        <span class="px-2 py-1 text-xs font-semibold rounded-full ${statusClass}">${item.status}</span>
                        <small class="block md:inline ml-2 text-gray-500">
                            | Donor: ${item.donorEmail}
                            | NGO: ${item.ngoEmail || 'N/A'}
                        </small>
                    </div>
                `;
                container.appendChild(historyItem);
            });
        }
    } catch (error) {
        console.error('Error fetching history:', error);
        container.innerHTML = `<div class="p-4 text-center text-red-500">❌ Error loading history: ${error.message}</div>`;
    }
}


// =========================================================================
//                             NEW CAMPAIGN APPROVAL FUNCTIONS
// =========================================================================

/**
 * Fetches and displays all pending campaign requests for admin approval.
 */
async function fetchPendingCampaigns() {
    const container = document.getElementById('pendingCampaignsContainer');
    if (!container) return;

    container.innerHTML = '<p class="text-center text-gray-500">⏳ Loading pending campaigns...</p>';

    try {
        const campaigns = await apiFetch(`${API_BASE}/admin/pending-campaigns`);

        container.innerHTML = '';
        if (Array.isArray(campaigns) && campaigns.length === 0) {
            container.innerHTML = '<p class="text-center text-green-600 p-4">✅ No pending campaigns currently.</p>';
        } else if (Array.isArray(campaigns)) {
            campaigns.forEach(campaign => {
                const item = document.createElement('div');
                item.className = 'flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white border border-gray-200 rounded-lg shadow-sm mb-4 transition duration-200 hover:shadow-md';
                item.innerHTML = `
                    <div class="mb-3 sm:mb-0">
                        <p class="font-semibold text-gray-900">${campaign.title}</p>
                        <p class="text-sm text-gray-600">ID: ${campaign.id} | Goal: ₹${campaign.goal}</p>
                        <p class="text-xs text-gray-500 mt-1">Created by NGO: <span class="font-medium text-purple-600">${campaign.ngoEmail || 'N/A'}</span></p>
                    </div>
                    <div class="flex space-x-2">
                        <button class="px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                            onclick="handleCampaignStatusUpdate(${campaign.id}, 'ACTIVE')">
                            Approve
                        </button>
                        <button class="px-3 py-1 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                            onclick="handleCampaignStatusUpdate(${campaign.id}, 'REJECTED')">
                            Reject
                        </button>
                    </div>
                `;
                container.appendChild(item);
            });
        }
    } catch (error) {
        console.error('Error fetching campaigns:', error);
        container.innerHTML = `<div class="p-4 text-center text-red-500">❌ Error loading campaigns: ${error.message}</div>`;
    }
}

/**
 * Sends a PATCH request to update the campaign status (ACTIVE/REJECTED).
 * @param {number} campaignId
 * @param {string} status 'ACTIVE' or 'REJECTED'
 */
async function handleCampaignStatusUpdate(campaignId, status) {
    if (!showCustomConfirm(`Are you sure you want to ${status.toLowerCase()} campaign ID ${campaignId}?`)) {
        return;
    }

    try {
        const result = await apiFetch(`${API_BASE}/admin/campaigns/${campaignId}/status?status=${status}`, {
            method: 'PATCH',
        });

        displayModalMessage('success', result.message || `Campaign status updated to ${status} successfully.`);
        fetchPendingCampaigns(); // Refresh the list
    } catch (error) {
        console.error('Error handling campaign status update:', error);
        displayModalMessage('error', `Failed to update campaign status: ${error.message}`);
    }
}


// =========================================================================
//                             INITIALIZATION
// =========================================================================

// Wait for DOM to load before attaching listeners
document.addEventListener('DOMContentLoaded', function() {
    // --- ADMIN Dashboard Check and Load ---
    if (window.location.pathname.includes('admin-dashboard.html')) {
        const userRole = localStorage.getItem('userRole');
        if (userRole !== 'ADMIN') {
            displayModalMessage('error', 'Access Denied. You must be an admin to view this page. Redirecting...');
            setTimeout(() => window.location.href = '/login.html', 500);
            return;
        }
        // Load all necessary admin data views
        fetchPendingRequests();
        fetchDonationHistory();
        fetchAvailableDonationsForAdmin();
        fetchPendingCampaigns(); // NEW: Load pending campaigns
    }
});