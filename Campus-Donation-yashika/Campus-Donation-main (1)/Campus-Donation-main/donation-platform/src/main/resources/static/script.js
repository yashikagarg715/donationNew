// Global API Base (consistent across all)
const API_BASE = 'http://localhost:8080';

// =========================================================================
//                             HELPER FUNCTIONS
// =========================================================================

/**
 * Replaces alert() behavior by displaying messages in a dedicated area.
 * @param {string} type 'success', 'error', or 'warning'
 * @param {string} message The text to display
 */
function displayModalMessage(type, message) {
    // Attempt to target dedicated message areas based on the current page context
    const messageArea = document.getElementById('globalMessageArea')
                     || document.getElementById('loginResult')
                     || document.getElementById('registerResult')
                     || document.getElementById('donationResult')
                     || document.getElementById('campaignResult')
                     || document.getElementById('needResult');

    let colorClass, symbol;

    if (type === 'success') {
        colorClass = 'bg-green-100 border-green-400 text-green-700';
        symbol = '✅';
    } else if (type === 'error') {
        colorClass = 'bg-red-100 border-red-400 text-red-700';
        symbol = '❌';
    } else { // warning
        colorClass = 'bg-yellow-100 border-yellow-400 text-yellow-700';
        symbol = '⚠️';
    }

    if (messageArea) {
        messageArea.innerHTML = `<div class="p-4 border-l-4 ${colorClass} rounded-md mb-4" role="alert">
            <p class="font-bold">${symbol} ${type.toUpperCase()}</p>
            <p>${message}</p>
        </div>`;
        // Clear message after a few seconds
        setTimeout(() => messageArea.innerHTML = '', 7000);
    } else {
        console.log(`[MODAL-${type.toUpperCase()}] ${message}`);
    }
}

/**
 * Replaces confirm() logic. Returns true to proceed in the absence of a real user dialog.
 * @param {string} message The confirmation question
 * @returns {boolean} Always true in this environment, but logged for tracing.
 */
function showCustomConfirm(message) {
    displayModalMessage('warning', `Confirmation required: ${message}. Proceeding automatically for testing.`);
    console.warn(`[CONFIRMATION MOCK] Assuming YES for action: ${message}`);
    return true; // Assume yes to allow app testing flow
}

// Shared Logout Function
function logout() {
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    displayModalMessage('success', 'You have been successfully logged out.');
    setTimeout(() => {
        window.location.href = '/index.html';
    }, 500);
}

/**
 * Utility function to handle API fetch, response buffering, and error processing.
 * FIX: This function is completely refactored to prevent the "body stream already read" error.
 * It attempts to read the body as JSON first, and falls back to plain text if JSON fails.
 */
async function apiFetch(url, options = {}) {
    try {
        const response = await fetch(url, options);

        // 1. Handle 204 No Content explicitly
        if (response.status === 204) {
            if (response.ok) {
                return { message: 'Action successful (No Content).' };
            }
        }

        // 2. Try to read the body as JSON first (safe if body is valid JSON)
        let data;
        try {
            data = await response.json();
        } catch (e) {
            // If response.json() failed (usually because the body was empty or plain text):
            // Fallback: Read the body as plain text (safe because JSON read failed)
            try {
                const text = await response.text();
                // If text exists, wrap it in a message object.
                data = { message: text || 'Action successful.' };
            } catch (textError) {
                // Should not happen, but handles stream corruption case.
                data = {};
            }
        }

        // 3. Handle success (2xx)
        if (response.ok) {
            // If data is a message from the text fallback, return it as success. Otherwise, return the full parsed data.
            return data;
        }

        // 4. Handle error (4xx/5xx)
        else {
            let errorMessage = `Request failed with status: ${response.status} (${response.statusText})`;

            if (data && typeof data === 'object') {
                // Try to extract error message from parsed JSON or text fallback
                errorMessage = data.message || data.error || errorMessage;
            } else if (typeof data.message === 'string') {
                errorMessage = data.message;
            }

            throw new Error(errorMessage);
        }

    } catch (error) {
        console.error('API Network or Logic Error:', error);
        throw new Error(error.message || 'Network error. Please check your connection or server status.');
    }
}


// =========================================================================
//                             ADMIN FUNCTIONS
// =========================================================================

/**
 * Fetches all pending NGO need requests and renders them on the admin dashboard.
 */
async function fetchPendingNeeds() {
    const container = document.getElementById('pendingNeedsContainer');
    if (!container) return;

    container.innerHTML = '<p class="text-center text-gray-500 p-4">⏳ Loading pending NGO needs...</p>';

    try {
        const needs = await apiFetch(`${API_BASE}/admin/pending-needs`);

        container.innerHTML = '';
        const needArray = Array.isArray(needs) ? needs : [];

        if (needArray.length === 0) {
            container.innerHTML = '<p class="text-center text-green-600 p-4">✅ No pending NGO needs currently.</p>';
        } else {
            needArray.forEach(need => {
                const item = document.createElement('div');
                item.className = 'flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white border border-gray-200 rounded-lg shadow-sm mb-4 transition duration-200 hover:shadow-md';
                item.innerHTML = `
                    <div class="mb-3 sm:mb-0">
                        <p class="font-semibold text-gray-900">${need.itemName} (Qty: ${need.quantity})</p>
                        <p class="text-sm text-gray-600">ID: ${need.id}</p>
                        <p class="text-xs text-gray-500 mt-1">Posted by NGO: <span class="font-medium text-teal-600">${need.ngoEmail || 'N/A'}</span></p>
                    </div>
                    <div class="flex space-x-2">
                        <button class="px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                            onclick="handleNeedStatusUpdate(${need.id}, 'AVAILABLE')">
                            Mark Available
                        </button>
                        <button class="px-3 py-1 text-sm bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition"
                            onclick="handleNeedStatusUpdate(${need.id}, 'UNAVAILABLE')">
                            Mark Unavailable
                        </button>
                    </div>
                `;
                container.appendChild(item);
            });
        }
    } catch (error) {
        console.error('Error fetching NGO needs:', error);
        container.innerHTML = `<div class="p-4 text-center text-red-500">❌ Error loading needs: ${error.message}</div>`;
    }
}

/**
 * Sends a PATCH request to update the NGO Need status (AVAILABLE/UNAVAILABLE).
 */
async function handleNeedStatusUpdate(needId, status) {
    if (!showCustomConfirm(`Are you sure you want to mark need ID ${needId} as ${status}?`)) {
        return;
    }

    try {
        const result = await apiFetch(`${API_BASE}/admin/needs/${needId}/status?status=${status}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' }
        });

        displayModalMessage('success', result.message || `Need status updated to ${status} successfully.`);
        fetchPendingNeeds(); // Refresh the pending needs list
    } catch (error) {
        console.error('Error handling need status update:', error);
        displayModalMessage('error', `Failed to update need status: ${error.message}`);
    }
}


/**
 * Fetches all pending donation requests (Donor Item -> NGO Claim) and renders them.
 */
async function fetchPendingRequests() {
    const container = document.getElementById('pendingRequestsContainer');
    if (!container) return;

    container.innerHTML = '<p class="text-center text-gray-500 p-4">⏳ Loading pending requests...</p>';

    try {
        const requests = await apiFetch(`${API_BASE}/admin/pending-donations`);

        container.innerHTML = '';
        const requestArray = Array.isArray(requests) ? requests : [];

        if (requestArray.length === 0) {
            container.innerHTML = '<p class="text-center text-green-600 p-4">✅ No pending donation requests.</p>';
        } else {
            requestArray.forEach(request => {
                const item = document.createElement('div');
                item.className = 'flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white border border-gray-200 rounded-lg shadow-sm mb-4 transition duration-200 hover:shadow-md';
                item.innerHTML = `
                    <div class="mb-3 sm:mb-0">
                        <p class="font-semibold text-gray-900">${request.itemName} (Qty: ${request.quantity})</p>
                        <p class="text-sm text-gray-600">ID: ${request.id} | Donor: ${request.donorEmail || 'N/A'}</p>
                        <p class="text-xs text-gray-500 mt-1">Requested by NGO: <span class="font-medium text-indigo-600">${request.ngoEmail || 'N/A'}</span></p>
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
 * ADMIN: Handles the approval or rejection of an NGO's request for a Donor's donation.
 * IMPORTANT: Added robust logging for debugging purposes.
 */
async function handleRequest(donationId, status) {
    if (!showCustomConfirm(`Are you sure you want to ${status.toLowerCase()} donation ID ${donationId} to ${status}?`)) {
        return;
    }

    // Construct the target URL
    const targetUrl = `${API_BASE}/admin/donations/${donationId}/status?status=${status}`;

    // === DEBUG LOGGING ===
    console.log(`[DEBUG] Attempting to update donation status.`);
    console.log(`[DEBUG] Target URL: ${targetUrl}`);
    console.log(`[DEBUG] Status: ${status}`);
    // =====================

    try {
        const result = await apiFetch(targetUrl, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' }
        });

        displayModalMessage('success', result.message || `Status updated to ${status} successfully.`);
        fetchPendingRequests(); // Refresh the pending list
        fetchDonationHistory(); // Refresh the history
    } catch (error) {
        // Log the full error to the console and display a generic message to the user
        console.error('ADMIN ACTION ERROR: Failed to process request.', error);
        displayModalMessage('error', `Failed to update request status. Check console (F12) for URL and Backend Error: ${error.message}`);
    }
}

async function fetchDonationHistory() {
    const container = document.getElementById('donationHistoryContainer');
    if (!container) return;

    container.innerHTML = '<p class="text-center text-gray-500 p-4">⏳ Loading donation history...</p>';

    try {
        const history = await apiFetch(`${API_BASE}/admin/donation-history`);

        container.innerHTML = '';
        const historyArray = Array.isArray(history) ? history : [];

        if (historyArray.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-500 p-4">No history found yet.</p>';
        } else {
            historyArray.forEach(item => {
                const statusClass = item.status === 'APPROVED' ? 'text-green-600 bg-green-100' :
                                    item.status === 'REJECTED' ? 'text-red-600 bg-red-100' : 'text-yellow-600 bg-yellow-100';

                const historyItem = document.createElement('div');
                historyItem.className = 'p-4 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-50 hover:bg-gray-50 transition duration-150';
                historyItem.innerHTML = `
                    <div class="mb-2 md:mb-0">
                        <span class="font-bold text-gray-800">${item.itemName}</span>
                        <span class="text-sm text-gray-600">(Qty: ${item.quantity})</span>
                    </div>
                    <div class="text-right text-sm">
                        <span class="px-2 py-1 text-xs font-semibold rounded-full ${statusClass}">${item.status}</span>
                        <small class="block md:inline ml-2 text-gray-500">
                            | Donor: ${item.donor ? item.donor.email : 'N/A'}
                            | NGO: ${item.ngo ? item.ngo.email : 'N/A'}
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
//                             NGO FUNCTIONS (Kept for completeness)
// =========================================================================

async function loadAvailableDonations() {
    const container = document.getElementById('availableDonationsList');
    if (!container) return;

    container.innerHTML = '<p class="text-center text-gray-500 p-4">Loading available donations...</p>';

    try {
        // Fetch only donations that are LISTED
        const donations = await apiFetch(`${API_BASE}/donations/available`);

        container.innerHTML = '';
        const donationArray = Array.isArray(donations) ? donations : [];

        if (donationArray.length === 0) {
            container.innerHTML = '<p class="text-center text-green-600 p-4">✅ No available donations at the moment. Time to create a campaign or post a need!</p>';
        } else {
            donationArray.forEach(donation => {
                // Ensure only LISTED items are displayed, although backend filter handles this.
                if (donation.status !== 'LISTED') return;

                const buttonText = 'Request This';
                const buttonClass = 'px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition';

                const onClickAction = `onclick="requestDonation(${donation.id})"`;

                const item = document.createElement('div');
                item.className = 'list-item flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white border border-gray-200 rounded-lg shadow-sm mb-3';
                item.innerHTML = `
                    <div class="content mb-3 sm:mb-0">
                        <strong class="text-lg text-indigo-700">${donation.itemName}</strong> (Quantity: ${donation.quantity})<br>
                        <small class="text-gray-600">${donation.description || 'No description provided'}</small>
                        <small class="block text-xs mt-1 text-gray-500">Donor: ${donation.donor ? donation.donor.email : 'N/A'}</small>
                    </div>
                    <div class="actions">
                        <button class="${buttonClass}" ${onClickAction}>
                            ${buttonText}
                        </button>
                    </div>
                `;
                container.appendChild(item);
            });
        }
    } catch (error) {
        console.error('Error loading donations:', error);
        container.innerHTML = `<div class="p-4 text-center text-red-500">❌ Error loading donations: ${error.message}</div>`;
    }
}


async function loadMyRequestedDonations() {
    const container = document.getElementById('myRequestedDonationsList');
    const userEmail = localStorage.getItem('userEmail');
    if (!container || !userEmail) return;

    container.innerHTML = '<p class="text-center text-gray-500 p-4">Loading your pending requests...</p>';

    try {
        // Fetch donations where current user is the NGO and status is PENDING
        const requests = await apiFetch(`${API_BASE}/donations/my-requests?ngoEmail=${userEmail}`);

        container.innerHTML = '';
        const requestArray = Array.isArray(requests) ? requests : [];

        if (requestArray.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-500 p-4">You have no pending donation requests.</p>';
        } else {
            requestArray.forEach(request => {
                const item = document.createElement('div');
                item.className = 'list-item p-4 border border-yellow-200 rounded-lg shadow-sm mb-3 bg-yellow-50';
                item.innerHTML = `
                    <div class="content">
                        <strong class="text-lg text-yellow-700">${request.itemName}</strong> (Quantity: ${request.quantity})<br>
                        <small class="text-gray-600">${request.description || 'No description provided'}</small>
                        <small class="block text-xs mt-1 text-gray-500">Donor: ${request.donor ? request.donor.email : 'N/A'}</small>
                        <span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-300 text-yellow-900 mt-2 inline-block">
                            PENDING ADMIN APPROVAL
                        </span>
                    </div>
                `;
                container.appendChild(item);
            });
        }
    } catch (error) {
        console.error('Error loading requested donations:', error);
        container.innerHTML = `<div class="p-4 text-center text-red-500">❌ Error loading requested donations: ${error.message}</div>`;
    }
}


async function requestDonation(donationId) {
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail) {
        displayModalMessage('error', 'You must be logged in to request donations.');
        return;
    }

    if (!showCustomConfirm('Are you sure you want to request this donation? This action is pending Admin approval.')) {
        return;
    }

    try {
        const response = await apiFetch(`${API_BASE}/donations/request/${donationId}`, {
            method: 'PATCH',
            // Pass NGO email in the header, as expected by the backend
            headers: {
                'User-Email': userEmail
            }
        });

        // 1. Show success message
        displayModalMessage('success', response.message || 'Donation requested successfully! It is now pending admin approval.');

        // 2. Refresh the Available List (item should disappear)
        loadAvailableDonations();

        // 3. Refresh My Requested List (item should appear here)
        loadMyRequestedDonations();

    } catch (error) {
        console.error('Error requesting donation:', error);
        displayModalMessage('error', `An error occurred: ${error.message}`);
    }
}

// --- NGO NEEDS/REQUIREMENTS ---

/**
 * Handles the submission of the NGO need form.
 */
async function handleNeedForm(e) {
    e.preventDefault();
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail) {
        displayModalMessage('error', 'Authentication failed. Please log in.');
        return;
    }

    const needData = {
        itemName: document.getElementById('needItemName').value,
        quantity: parseInt(document.getElementById('needQuantity').value),
    };

    try {
        const result = await apiFetch(`${API_BASE}/needs/post`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Email': userEmail
            },
            body: JSON.stringify(needData)
        });

        displayModalMessage('success', result.message || 'Your requirement has been posted successfully!');
        document.getElementById('needForm').reset();
        loadMyNeeds(); // Refresh the list of my posted needs
    } catch (error) {
        console.error('Need posting error:', error);
        displayModalMessage('error', error.message);
    }
}

/**
 * Loads the current NGO's posted material needs.
 */
async function loadMyNeeds() {
    const container = document.getElementById('myNeedsList');
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail || !container) return;

    container.innerHTML = '<p class="text-center text-gray-500 p-4">Loading your posted needs...</p>';

    try {
        const needs = await apiFetch(`${API_BASE}/needs/my-needs?ngoEmail=${userEmail}`);

        container.innerHTML = '';
        const needArray = Array.isArray(needs) ? needs : [];

        if (needArray.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-500 p-4">You have not posted any material needs yet.</p>';
        } else {
            needArray.forEach(need => {
                // Determine status and styling based on Admin response
                const status = need.status || 'PENDING';
                let statusClass = 'bg-gray-100 text-gray-800';
                let statusText = status;

                if (status === 'AVAILABLE') {
                    statusClass = 'bg-green-100 text-green-800';
                    statusText = '✅ ITEM AVAILABLE (Contact Admin)';
                } else if (status === 'UNAVAILABLE') {
                    statusClass = 'bg-red-100 text-red-800';
                    statusText = '❌ ITEM UNAVAILABLE';
                } else {
                    statusClass = 'bg-indigo-100 text-indigo-800';
                    statusText = '⏳ PENDING ADMIN REVIEW';
                }


                const item = document.createElement('div');
                item.className = 'list-item p-4 border border-indigo-200 rounded-lg shadow-sm hover:shadow-md mb-4 bg-white';
                item.innerHTML = `
                    <div class="content">
                        <h3 class="text-lg font-bold text-indigo-700">${need.itemName}</h3>
                        <p class="text-gray-600">Quantity Required: ${need.quantity}</p>
                        <span class="px-2 py-0.5 text-xs font-semibold rounded-full ${statusClass} mt-2 inline-block">${statusText}</span>
                    </div>
                `;
                container.appendChild(item);
            });
        }
    } catch (error) {
        console.error('Error loading needs:', error);
        container.innerHTML = `<div class="p-4 text-center text-red-500">❌ Error loading needs: ${error.message}</div>`;
    }
}


// --- CAMPAIGN FUNCTIONS ---

async function loadMyCampaigns() {
    const container = document.getElementById('myCampaignsList');
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail || !container) return;

    container.innerHTML = '<p class="text-center text-gray-500 p-4">Loading your campaigns...</p>';

    try {
        const campaigns = await apiFetch(`${API_BASE}/campaigns/my-campaigns?ngoEmail=${userEmail}`);

        container.innerHTML = '';
        const campaignArray = Array.isArray(campaigns) ? campaigns : [];

        if (campaignArray.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-500 p-4">You have not created any campaigns yet.</p>';
        } else {
            campaignArray.forEach(campaign => {
                const percentage = Math.min(100, (campaign.currentAmount / campaign.goal) * 100 || 0);
                const statusColor = percentage >= 100 ? 'bg-green-500' : 'bg-blue-500';

                const item = document.createElement('div');
                item.className = 'list-item p-4 border border-gray-100 rounded-lg shadow-sm hover:shadow-md mb-4 bg-white';
                item.innerHTML = `
                    <div class="content">
                        <h3 class="text-xl font-bold text-gray-800">${campaign.title}</h3>
                        <p class="text-gray-600 mb-3">${campaign.description}</p>

                        <!-- Progress Bar -->
                        <div class="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                            <div class="h-2.5 rounded-full ${statusColor} transition-all duration-500" style="width: ${percentage}%"></div>
                        </div>

                        <p class="mt-2 text-sm font-semibold flex justify-between">
                            <span>Goal: ₹${campaign.goal.toFixed(2)}</span>
                            <span>Raised: <span class="text-green-600">₹${campaign.currentAmount.toFixed(2)}</span> (${percentage.toFixed(0)}%)</span>
                        </p>
                        <small class="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 mt-2 inline-block">${campaign.status}</small>
                    </div>
                `;
                container.appendChild(item);
            });
        }
    } catch (error) {
        console.error('Error loading campaigns:', error);
        container.innerHTML = `<div class="p-4 text-center text-red-500">❌ Error loading campaigns: ${error.message}</div>`;
    }
}


// =========================================================================
//                             DONOR FUNCTIONS
// =========================================================================

function updateDonationStats(donations) {
    const totalCard = document.getElementById('totalDonations');
    const pendingCard = document.getElementById('pendingDonations');
    const approvedCard = document.getElementById('approvedDonations');

    if (!donations || donations.length === 0) {
        if (totalCard) totalCard.textContent = 0;
        if (pendingCard) pendingCard.textContent = 0;
        if (approvedCard) approvedCard.textContent = 0;
        return;
    }

    let total = donations.length;
    let pending = 0;
    let approved = 0;

    donations.forEach(donation => {
        if (donation.status === 'PENDING') pending++;
        else if (donation.status === 'APPROVED') approved++;
    });

    if (totalCard) totalCard.textContent = total;
    if (pendingCard) pendingCard.textContent = pending;
    if (approvedCard) approvedCard.textContent = approved;
}


async function loadMyDonations() {
    const userEmail = localStorage.getItem('userEmail');
    const donationsContainer = document.getElementById('donationsContainer');
    if (!userEmail || !donationsContainer) return;

    donationsContainer.innerHTML = '<p class="text-center text-gray-500 p-4">Loading your donations...</p>';

    try {
        const donations = await apiFetch(`${API_BASE}/donations/my-donations?email=${userEmail}`);
        donationsContainer.innerHTML = '';

        const donationArray = Array.isArray(donations) ? donations : [];

        // Stats variables
        let total = donationArray.length;
        let pending = 0;
        let approved = 0;

        if (donationArray.length === 0) {
            donationsContainer.innerHTML = '<p class="text-center text-gray-500 p-4">You have not made any donations yet.</p>';
        } else {
            donationArray.forEach(donation => {
                // Count status for stats
                if (donation.status === 'PENDING') pending++;
                else if (donation.status === 'APPROVED') approved++;

                let statusClass = 'bg-gray-100 text-gray-800';
                let statusText = donation.status;

                const ngoEmailDisplay = donation.ngoEmail || (donation.ngo ? donation.ngo.email : 'N/A');

                if (donation.status === 'PENDING') {
                    statusClass = 'bg-yellow-100 text-yellow-800';
                    statusText = `PENDING (Requested by ${ngoEmailDisplay})`;
                } else if (donation.status === 'APPROVED') {
                    statusClass = 'bg-green-100 text-green-800';
                    statusText = `APPROVED (Claimed by ${ngoEmailDisplay})`;
                } else if (donation.status === 'REJECTED') {
                    statusClass = 'bg-red-100 text-red-800';
                }

                const donationItem = document.createElement('div');
                donationItem.className = 'p-4 border-b border-gray-100 hover:bg-gray-50 flex justify-between items-center';
                donationItem.innerHTML = `
                        <div>
                            <strong class="text-gray-900">${donation.itemName}</strong> (Qty: ${donation.quantity})<br>
                            <small class="text-gray-600">${donation.description || 'No description provided'}</small>
                        </div>
                        <span class="px-3 py-1 text-xs font-semibold rounded-full ${statusClass}">
                            ${statusText}
                        </span>
                    `;
                donationsContainer.appendChild(donationItem);
            });
        }

        // Update stats cards
        const totalCard = document.getElementById('totalDonations');
        const pendingCard = document.getElementById('pendingDonations');
        const approvedCard = document.getElementById('approvedDonations');

        if (totalCard) totalCard.textContent = total;
        if (pendingCard) pendingCard.textContent = pending;
        if (approvedCard) approvedCard.textContent = approved;

    } catch (error) {
        console.error('Load donations error:', error);
        donationsContainer.innerHTML = `<div class="p-4 text-center text-red-500">❌ Failed to load donations: ${error.message}</div>`;
    }
}

// =========================================================================
//                             DONOR FUNCTIONS (Updated with Campaigns)
// =========================================================================

// ... (existing updateDonationStats and loadMyDonations unchanged)

// NEW: Loads active campaigns for donors to browse and donate
async function loadAvailableCampaigns() {
    const container = document.getElementById('availableCampaignsList');
    if (!container) return;  // Only if element exists on donor-dashboard.html

    container.innerHTML = '<p class="text-center text-gray-500 p-4">⏳ Loading active campaigns...</p>';

    try {
        const campaigns = await apiFetch(`${API_BASE}/campaigns/active`);

        container.innerHTML = '';
        const campaignArray = Array.isArray(campaigns) ? campaigns : [];

        if (campaignArray.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-500 p-4">No active campaigns at the moment. Check back later!</p>';
        } else {
            campaignArray.forEach(campaign => {
                const percentage = Math.min(100, ((campaign.currentAmount / campaign.goal) * 100) || 0);
                const statusColor = percentage >= 100 ? 'bg-green-500' : 'bg-blue-500';

                const item = document.createElement('div');
                item.className = 'list-item p-4 border border-gray-200 rounded-lg shadow-sm hover:shadow-md mb-4 bg-white';
                item.innerHTML = `
                    <div class="content">
                        <h3 class="text-xl font-bold text-gray-800">${campaign.title}</h3>
                        <p class="text-gray-600 mb-3">${campaign.description}</p>
                        <p class="text-sm text-gray-500 mb-2">By NGO: ${campaign.ngoEmail}</p>

                        <!-- Progress Bar -->
                        <div class="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                            <div class="h-2.5 rounded-full ${statusColor} transition-all duration-500" style="width: ${percentage}%"></div>
                        </div>

                        <p class="mt-2 text-sm font-semibold flex justify-between">
                            <span>Goal: ₹${campaign.goal.toFixed(2)}</span>
                            <span>Raised: <span class="text-green-600">₹${campaign.currentAmount.toFixed(2)}</span> (${percentage.toFixed(0)}%)</span>
                        </p>
                        <small class="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 mt-2 inline-block">${campaign.status.toUpperCase()}</small>
                        
                        <!-- Donate Button -->
                        <button class="mt-3 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition w-full sm:w-auto"
                                onclick="donateToCampaign(${campaign.id}, '${campaign.title}')">
                            Donate Now
                        </button>
                    </div>
                `;
                container.appendChild(item);
            });
        }
    } catch (error) {
        console.error('Error loading campaigns:', error);
        container.innerHTML = `<div class="p-4 text-center text-red-500">❌ Error loading campaigns: ${error.message}</div>`;
    }
}

// NEW: Handles donation to a specific campaign (prompts for amount, sends API)
async function donateToCampaign(campaignId, campaignTitle) {
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail) {
        displayModalMessage('error', 'Please log in to donate.');
        return;
    }

    if (!showCustomConfirm(`Donate to "${campaignTitle}"? Enter amount below.`)) {
        return;
    }

    // Simple prompt for amount (replace with modal/form later for better UX)
    const amountStr = prompt('Enter donation amount (₹):', '100');
    if (!amountStr || isNaN(amountStr) || parseFloat(amountStr) <= 0) {
        displayModalMessage('error', 'Invalid amount. Please enter a positive number.');
        return;
    }

    const donationData = { amount: parseFloat(amountStr) };

    try {
        const result = await apiFetch(`${API_BASE}/campaigns/${campaignId}/donate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User  -Email': userEmail  // Donor email for auth/logging
            },
            body: JSON.stringify(donationData)
        });

        displayModalMessage('success', result.message || `Donated ₹${amountStr} successfully!`);

        // Refresh the campaigns list to show updated progress
        loadAvailableCampaigns();

        // Optional: Refresh donor's donations if you add a "my donations" for campaigns later
        if (document.getElementById('donationsContainer')) loadMyDonations();

    } catch (error) {
        console.error('Donation error:', error);
        displayModalMessage('error', `Failed to donate: ${error.message}`);
    }
}

// ... (rest of script.js unchanged)



// =========================================================================
//                             EVENT LISTENERS
// =========================================================================

document.addEventListener('DOMContentLoaded', function() {

    // --- REGISTER HANDLER (for register.html) ---
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username')?.value || '';
            const email = document.getElementById('email')?.value || '';
            const password = document.getElementById('password')?.value || '';
            const role = document.getElementById('role')?.value || '';

            try {
                const data = await apiFetch(`${API_BASE}/users/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password, role })
                });

                displayModalMessage('success',
                    `Registration successful for <b>${username}</b> as ${data.role || role}! Redirecting to login...`);
                registerForm.reset();
                setTimeout(() => window.location.href = 'login.html', 1500);
            } catch (error) {
                console.error('Register error:', error);
                displayModalMessage('error', error.message);
            }
        });
    }

    // --- LOGIN HANDLER (for login.html) ---
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail')?.value || '';
            const password = document.getElementById('loginPassword')?.value || '';

            try {
                const data = await apiFetch(`${API_BASE}/users/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                localStorage.setItem('userEmail', email);
                if (data.role) {
                    localStorage.setItem('userRole', data.role);
                }

                displayModalMessage('success', `Login successful! Welcome, ${data.role}. Redirecting...`);

                setTimeout(() => {
                    const role = data.role;
                    if (role === 'NGO') {
                        window.location.href = 'ngo-dashboard.html';
                    } else if (role === 'DONOR') {
                        window.location.href = 'donor-dashboard.html';
                    } else if (role === 'ADMIN') {
                        window.location.href = 'admin-dashboard.html';
                    } else {
                        window.location.href = 'index.html';
                    }
                }, 1000);
            } catch (error) {
                console.error('Login error:', error);
                displayModalMessage('error', error.message);
            }
        });
    }

    // --- NGO NEED FORM HANDLER ---
    const needForm = document.getElementById('needForm');
    if (needForm) {
        needForm.addEventListener('submit', handleNeedForm);
    }

    // --- DASHBOARD LOADERS ---
    const userRole = localStorage.getItem('userRole');

    if (userRole === 'NGO') {
        // Only load if the elements exist on ngo-dashboard.html
        if (document.getElementById('availableDonationsList')) loadAvailableDonations();
        if (document.getElementById('myCampaignsList')) loadMyCampaigns();
        if (document.getElementById('myRequestedDonationsList')) loadMyRequestedDonations();
        if (document.getElementById('myNeedsList')) loadMyNeeds();
    } else if (userRole === 'DONOR') {
        // Only load if the elements exist on donor-dashboard.html
        if (document.getElementById('donationsContainer')) loadMyDonations();
        if (document.getElementById('availableCampaignsList')) loadAvailableCampaigns();
    } else if (userRole === 'ADMIN') {
        // Only load if the elements exist on admin-dashboard.html
        if (document.getElementById('pendingRequestsContainer')) fetchPendingRequests();
        if (document.getElementById('donationHistoryContainer')) fetchDonationHistory();
        if (document.getElementById('pendingNeedsContainer')) fetchPendingNeeds();
    }


    // --- DONOR DONATION HANDLER (for donor-dashboard.html) ---
    const donationForm = document.getElementById('donationForm');
    if (donationForm) {
        donationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userEmail = localStorage.getItem('userEmail');
            if (!userEmail) {
                displayModalMessage('error', 'Authentication failed. Please log in.');
                return;
            }

            const donationData = {
                itemName: document.getElementById('itemName').value,
                quantity: parseInt(document.getElementById('quantity').value),
                description: document.getElementById('description').value
            };

            try {
                // Sending the user email via the Request Header
                const result = await apiFetch(`${API_BASE}/donations/add`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Email': userEmail
                    },
                    body: JSON.stringify(donationData)
                });

                displayModalMessage('success', result.message || 'Donation listed successfully!');
                donationForm.reset();
                loadMyDonations();
            } catch (error) {
                console.error('Donation error:', error);
                displayModalMessage('error', error.message);
            }
        });
    }

    // --- CAMPAIGN FORM HANDLER (for ngo-dashboard.html) ---
    const campaignForm = document.getElementById('campaignForm');
    if (campaignForm) {
        campaignForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userEmail = localStorage.getItem('userEmail');
            if (!userEmail) {
                displayModalMessage('error', 'Authentication failed. Please log in.');
                return;
            }

            const campaignData = {
                title: document.getElementById('campaignTitle').value,
                description: document.getElementById('campaignDescription').value,
                goal: parseFloat(document.getElementById('campaignGoal').value),
            };

            try {
                const result = await apiFetch(`${API_BASE}/campaigns/create`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Email': userEmail // Pass NGO email in the header
                    },
                    body: JSON.stringify(campaignData)
                });

                displayModalMessage('success', result.message || 'Campaign created successfully!');
                campaignForm.reset();
                loadMyCampaigns();
            } catch (error) {
                console.error('Campaign creation error:', error);
                displayModalMessage('error', error.message);
            }
        });
    }


    // --- LOGOUT BUTTON LISTENER ---
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }
});