// Auth UI elements
const authSection = document.getElementById('auth-section');
const authContainer = document.getElementById('auth-container');
const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const authSubmit = document.getElementById('auth-submit');
const authError = document.getElementById('auth-error');
const authSuccess = document.getElementById('auth-success');
const loginTab = document.getElementById('login-tab');
const signupTab = document.getElementById('signup-tab');
const logoutButton = document.getElementById('logout-button');
const userInfo = document.getElementById('user-info');
const forgotPasswordButton = document.getElementById('forgot-password-button');
const forgotPasswordContainer = document.getElementById('forgot-password-container');
const guestButton = document.getElementById('guest-button');

// List management UI elements
const listModal = document.getElementById('list-modal');
const savedListsContainer = document.getElementById('saved-lists-container');
const newListButton = document.getElementById('new-list-button');
const closeModalButton = document.getElementById('close-modal-button');

// Ranking UI elements
const itemsInput = document.getElementById('items-input');
const startButton = document.getElementById('start-button');
const optionAButton = document.getElementById('option-a');
const optionBButton = document.getElementById('option-b');
const restartButton = document.getElementById('restart-button');
const inputSection = document.getElementById('input-section');
const comparisonSection = document.getElementById('comparison-section');
const resultsSection = document.getElementById('results-section');
const resultsList = document.getElementById('results-list');
const errorMessage = document.getElementById('error-message');
const progressText = document.getElementById('progress');
const progressBar = document.getElementById('progress-bar');
const progressFill = document.getElementById('progress-fill');
const statsToggle = document.getElementById('stats-toggle');
const statsPanel = document.getElementById('stats-panel');

// Mode selection elements
const modeRadios = document.querySelectorAll('input[name="ranking-mode"]');
const dailyModeOption = document.getElementById('daily-mode-option');
const dailyModeRadio = document.getElementById('daily-mode-radio');
const dailyModeLoginMessage = document.getElementById('daily-mode-login-message');
const dailyOptions = document.getElementById('daily-options');
const dailyEmailInput = document.getElementById('daily-email');
const dailyTimeInput = document.getElementById('daily-time');

// Auth state
let isLogin = true;
let currentUser = null;
let isGuestMode = false;

// Ranking state
let items = [];
let sortedItems = [];
let currentIndex = 0;
let currentItem = '';
let low = 0;
let high = 0;
let mid = 0;
let totalSteps = 0;
let completedSteps = 0;
let currentListId = null;
let rankingMode = 'basic'; // 'basic' or 'daily'
let dailyEmail = '';
let dailyTime = '09:00';

// Constants
const MAX_LISTS_PER_USER = 3;
const GUEST_STORAGE_KEY = 'guestList';
// Backend URL - can be overridden via window.BACKEND_URL for different environments
// For production deployment with Cloudflare Workers, set this to your worker URL:
// const BACKEND_URL = window.BACKEND_URL || 'https://daily-pairwise.YOUR-SUBDOMAIN.workers.dev';
// For local development with Express.js backend:
const BACKEND_URL = window.BACKEND_URL || 'http://localhost:3000';

// Mode selection event listeners
modeRadios.forEach(radio => {
  radio.addEventListener('change', (e) => {
    rankingMode = e.target.value;
    if (rankingMode === 'daily') {
      // Check if user is logged in (not guest mode) and has valid email
      if (isGuestMode || !currentUser || !currentUser.email || currentUser.email === 'Guest') {
        // Prevent selection and reset to basic mode
        e.target.checked = false;
        document.querySelector('input[name="ranking-mode"][value="basic"]').checked = true;
        rankingMode = 'basic';
        showError('Daily Mode is only available to logged-in users. Please sign in to use this feature.');
        return;
      }
      
      dailyOptions.classList.remove('hidden');
      // Pre-fill email with user's account email (read-only)
      dailyEmailInput.value = currentUser.email;
    } else {
      dailyOptions.classList.add('hidden');
    }
  });
});

startButton.addEventListener('click', async () => {
  const parsed = parseItems(itemsInput.value);

  if (parsed.length === 0) {
    showError('Please provide at least one item to rank.');
    return;
  }

  // Validate daily mode inputs
  if (rankingMode === 'daily') {
    // Ensure user is logged in with valid email
    if (isGuestMode || !currentUser || !currentUser.email || currentUser.email === 'Guest') {
      showError('Daily Mode is only available to logged-in users. Please sign in first.');
      return;
    }
    
    // Use the logged-in user's email
    dailyEmail = currentUser.email;
    dailyTime = dailyTimeInput.value;
    
    if (!dailyTime) {
      showError('Please select a preferred time for daily emails.');
      return;
    }
  }

  // Check list limit for non-guest users
  if (!isGuestMode) {
    const canCreateList = await checkListLimit();
    if (!canCreateList) {
      showError(`You can only have ${MAX_LISTS_PER_USER} active lists at a time. Please complete or delete an existing list first.`);
      return;
    }
  }

  hideError();
  items = parsed;
  currentListId = null; // New list
  beginRanking();
});

optionAButton.addEventListener('click', async () => {
  // The current item wins the comparison.
  markComparisonComplete();
  high = mid;
  await nextStep();
});

optionBButton.addEventListener('click', async () => {
  // The existing ranked item stays ahead.
  markComparisonComplete();
  low = mid + 1;
  await nextStep();
});

restartButton.addEventListener('click', resetApp);

if (statsToggle && statsPanel) {
  statsToggle.addEventListener('click', () => {
    const isHidden = statsPanel.classList.toggle('hidden');
    statsToggle.setAttribute('aria-expanded', String(!isHidden));

    if (!isHidden) {
      updateStatsPanel();
    }
  });
}

itemsInput.addEventListener('input', updateStatsPanel);

// Auth event listeners
loginTab.addEventListener('click', () => {
  isLogin = true;
  loginTab.classList.add('active');
  signupTab.classList.remove('active');
  authSubmit.textContent = 'Sign In';
  if (forgotPasswordContainer) {
    forgotPasswordContainer.classList.remove('hidden');
  }
  hideAuthError();
  hideAuthSuccess();
});

signupTab.addEventListener('click', () => {
  isLogin = false;
  signupTab.classList.add('active');
  loginTab.classList.remove('active');
  authSubmit.textContent = 'Sign Up';
  if (forgotPasswordContainer) {
    forgotPasswordContainer.classList.add('hidden');
  }
  hideAuthError();
  hideAuthSuccess();
});

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAuthError();
  
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  
  if (!email || !password) {
    showAuthError('Please enter both email and password.');
    return;
  }
  
  authSubmit.disabled = true;
  authSubmit.textContent = isLogin ? 'Signing in...' : 'Signing up...';
  
  try {
    if (isLogin) {
      await window.firebaseAuthFunctions.signInWithEmailAndPassword(window.firebaseAuth, email, password);
    } else {
      await window.firebaseAuthFunctions.createUserWithEmailAndPassword(window.firebaseAuth, email, password);
    }
    // Auth state change will handle UI updates
  } catch (error) {
    let message = 'An error occurred. Please try again.';
    
    if (error.code === 'auth/email-already-in-use') {
      message = 'This email is already in use. Please sign in instead.';
    } else if (error.code === 'auth/invalid-email') {
      message = 'Invalid email address.';
    } else if (error.code === 'auth/weak-password') {
      message = 'Password should be at least 6 characters.';
    } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      message = 'Invalid email or password.';
    } else if (error.code === 'auth/invalid-credential') {
      message = 'Invalid email or password.';
    }
    
    showAuthError(message);
  } finally {
    authSubmit.disabled = false;
    authSubmit.textContent = isLogin ? 'Sign In' : 'Sign Up';
  }
});

logoutButton.addEventListener('click', async () => {
  try {
    if (isGuestMode) {
      isGuestMode = false;
      currentUser = null;
      showAuthUI();
      updateUserInfo(null);
      resetApp();
    } else {
      await window.firebaseAuthFunctions.signOut(window.firebaseAuth);
      isGuestMode = false;
      resetApp();
    }
  } catch (error) {
    console.error('Sign out error:', error);
  }
});

forgotPasswordButton.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  
  if (!email) {
    showAuthError('Please enter your email address first.');
    return;
  }
  
  try {
    await window.firebaseAuthFunctions.sendPasswordResetEmail(window.firebaseAuth, email);
    showAuthSuccess('Password reset email sent! Check your inbox.');
    emailInput.value = '';
  } catch (error) {
    let message = 'Failed to send password reset email.';
    
    if (error.code === 'auth/user-not-found') {
      message = 'No account found with this email address.';
    } else if (error.code === 'auth/invalid-email') {
      message = 'Invalid email address.';
    }
    
    showAuthError(message);
  }
});

guestButton.addEventListener('click', () => {
  isGuestMode = true;
  currentUser = { uid: 'guest', email: 'Guest' };
  showAppUI();
  updateUserInfo(currentUser);
  loadGuestList();
});

newListButton.addEventListener('click', () => {
  hideListModal();
  resetApp();
});

closeModalButton.addEventListener('click', () => {
  hideListModal();
});

function parseItems(raw) {
  return raw
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.remove('hidden');
}

function hideError() {
  errorMessage.textContent = '';
  errorMessage.classList.add('hidden');
}

async function beginRanking() {
  inputSection.classList.add('hidden');
  comparisonSection.classList.add('hidden');
  resultsSection.classList.add('hidden');

  sortedItems = [];
  currentIndex = 0;

  initializeProgressTracking();

  // Save initial state
  await saveCurrentList();

  if (items.length === 1) {
    sortedItems = [...items];
    currentIndex = items.length;
    showResults();
    return;
  }

  // Handle daily mode
  if (rankingMode === 'daily') {
    // For daily mode, show confirmation and send first email
    showDailyModeConfirmation();
    return;
  }

  // Basic mode - continue as usual
  sortedItems = [items[0]];
  currentIndex = 1;
  prepareInsertion();
}

async function showDailyModeConfirmation() {
  inputSection.classList.remove('hidden');
  inputSection.innerHTML = `
    <div class="card">
      <h2>✅ Daily Mode Activated</h2>
      <p>You will receive a daily email at <strong>${dailyTime}</strong> with a pairwise comparison.</p>
      <p>We'll send your first comparison shortly to <strong>${dailyEmail}</strong>.</p>
      <p>Click on your preferred option in the email to record your choice. You can also come back to this website anytime to continue ranking.</p>
      <button id="send-first-email" class="primary">Send First Email Now</button>
      <button id="back-to-input" class="secondary">Back</button>
    </div>
  `;
  
  document.getElementById('send-first-email').addEventListener('click', async () => {
    await sendFirstDailyEmail();
  });
  
  document.getElementById('back-to-input').addEventListener('click', () => {
    resetApp();
  });
}

async function sendFirstDailyEmail() {
  try {
    // Get the first two items to compare
    const itemA = items[0];
    const itemB = items.length > 1 ? items[1] : items[0];
    
    const response = await fetch(`${BACKEND_URL}/api/send-test-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: dailyEmail,
        itemA: itemA,
        itemB: itemB,
        listId: currentListId || 'new',
        pairId: '1'
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to send email');
    }
    
    alert('Email sent successfully! Check your inbox.');
  } catch (error) {
    console.error('Error sending email:', error);
    alert('Failed to send email. Make sure the backend server is running at ' + BACKEND_URL);
  }
}


function prepareInsertion() {
  if (currentIndex >= items.length) {
    updateProgress();
    showResults();
    return;
  }

  currentItem = items[currentIndex];
  low = 0;
  high = sortedItems.length;
  comparisonSection.classList.remove('hidden');
  updateProgress();
  compareNext();
}

async function nextStep() {
  if (low >= high) {
    sortedItems.splice(low, 0, currentItem);
    currentIndex += 1;
    
    // Save progress after each item is ranked
    await saveCurrentList();
    
    prepareInsertion();
  } else {
    compareNext();
  }
}

function compareNext() {
  if (low >= high) {
    nextStep();
    return;
  }

  mid = Math.floor((low + high) / 2);
  optionAButton.textContent = currentItem;
  optionBButton.textContent = sortedItems[mid];
  updateProgress();
}

function updateProgress() {
  if (!items.length) {
    resetProgressVisual();
    progressText.textContent = '';
    return;
  }

  const total = items.length;
  const rankedCount = sortedItems.length;
  const completion = totalSteps
    ? Math.min(completedSteps / totalSteps, 1)
    : Math.min(rankedCount / total, 1);

  updateProgressVisual(completion);

  if (currentIndex >= total) {
    const noun = total === 1 ? 'item' : 'items';
    progressText.textContent = `All ${total} ${noun} ranked.`;
    return;
  }

  const humanIndex = Math.min(currentIndex + 1, total);
  const noun = rankedCount === 1 ? 'item' : 'items';
  progressText.textContent = `Ranking item ${humanIndex} of ${total}. ${rankedCount} ${noun} ranked so far.`;
}

function updateProgressVisual(ratio) {
  const clamped = Math.max(0, Math.min(ratio, 1));
  const percentage = Math.round(clamped * 100);

  if (progressFill) {
    progressFill.style.width = `${clamped * 100}%`;
  }

  if (progressBar) {
    progressBar.setAttribute('aria-valuenow', String(percentage));
    progressBar.setAttribute('aria-valuetext', `${percentage}% complete`);
  }
}

function resetProgressVisual() {
  if (progressFill) {
    progressFill.style.width = '0%';
  }

  if (progressBar) {
    progressBar.setAttribute('aria-valuenow', '0');
    progressBar.setAttribute('aria-valuetext', '0% complete');
  }
}

function showResults() {
  comparisonSection.classList.add('hidden');
  resultsSection.classList.remove('hidden');
  resultsList.innerHTML = '';

  if (totalSteps > 0) {
    completedSteps = totalSteps;
    updateProgress();
  }

  sortedItems.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    resultsList.appendChild(li);
  });
}

function resetApp() {
  items = [];
  sortedItems = [];
  currentIndex = 0;
  currentItem = '';
  low = 0;
  high = 0;
  mid = 0;
  totalSteps = 0;
  completedSteps = 0;
  currentListId = null;
  itemsInput.value = '';
  resultsList.innerHTML = '';
  hideError();
  resetProgressVisual();
  progressText.textContent = '';

  resultsSection.classList.add('hidden');
  comparisonSection.classList.add('hidden');
  inputSection.classList.remove('hidden');

  if (statsPanel) {
    statsPanel.classList.add('hidden');
  }

  if (statsToggle) {
    statsToggle.setAttribute('aria-expanded', 'false');
  }

  updateStatsPanel();
  itemsInput.focus();
}

// Auth helper functions
function showAuthError(message) {
  authError.textContent = message;
  authError.classList.remove('hidden');
}

function hideAuthError() {
  authError.textContent = '';
  authError.classList.add('hidden');
}

function showAuthUI() {
  authSection.classList.remove('hidden');
  authContainer.classList.add('hidden');
  inputSection.classList.add('hidden');
  comparisonSection.classList.add('hidden');
  resultsSection.classList.add('hidden');
}

function showAppUI() {
  authSection.classList.add('hidden');
  authContainer.classList.remove('hidden');
  inputSection.classList.remove('hidden');
  itemsInput.focus();
}

function updateUserInfo(user) {
  if (user && user.email) {
    const prefix = isGuestMode ? 'Guest mode' : 'Signed in as:';
    userInfo.textContent = `${prefix} ${user.email}`;
  } else {
    userInfo.textContent = '';
  }
  
  // Update daily mode availability
  updateDailyModeAvailability();
}

function updateDailyModeAvailability() {
  if (isGuestMode || !currentUser || !currentUser.email || currentUser.email === 'Guest') {
    // Disable daily mode for guest users
    if (dailyModeOption) {
      dailyModeOption.classList.add('disabled');
    }
    if (dailyModeRadio) {
      dailyModeRadio.disabled = true;
    }
    if (dailyModeLoginMessage) {
      dailyModeLoginMessage.classList.remove('hidden');
    }
    // Reset to basic mode if daily was selected
    if (rankingMode === 'daily') {
      document.querySelector('input[name="ranking-mode"][value="basic"]').checked = true;
      rankingMode = 'basic';
      dailyOptions.classList.add('hidden');
    }
  } else {
    // Enable daily mode for logged-in users
    if (dailyModeOption) {
      dailyModeOption.classList.remove('disabled');
    }
    if (dailyModeRadio) {
      dailyModeRadio.disabled = false;
    }
    if (dailyModeLoginMessage) {
      dailyModeLoginMessage.classList.add('hidden');
    }
  }
}

function showAuthSuccess(message) {
  if (authSuccess) {
    authSuccess.textContent = message;
    authSuccess.classList.remove('hidden');
  }
}

function hideAuthSuccess() {
  if (authSuccess) {
    authSuccess.textContent = '';
    authSuccess.classList.add('hidden');
  }
}

function showListModal() {
  if (listModal) {
    listModal.classList.remove('hidden');
  }
}

function hideListModal() {
  if (listModal) {
    listModal.classList.add('hidden');
  }
}

// Firebase Firestore functions for list management
async function loadUserLists() {
  if (isGuestMode) {
    loadGuestList();
    return;
  }
  
  if (!currentUser || !window.firebaseDb || !window.firebaseDbFunctions) {
    return;
  }
  
  try {
    const { collection, getDocs, query, orderBy } = window.firebaseDbFunctions;
    const listsRef = collection(window.firebaseDb, `users/${currentUser.uid}/lists`);
    const q = query(listsRef, orderBy('lastModified', 'desc'));
    const snapshot = await getDocs(q);
    
    const lists = [];
    snapshot.forEach((doc) => {
      lists.push({ id: doc.id, ...doc.data() });
    });
    
    if (lists.length > 0) {
      displaySavedLists(lists);
      showListModal();
    }
  } catch (error) {
    console.error('Error loading lists:', error);
  }
}

function displaySavedLists(lists) {
  if (!savedListsContainer) return;
  
  savedListsContainer.innerHTML = '';
  
  lists.forEach((list) => {
    const listItem = document.createElement('div');
    listItem.className = 'saved-list-item';
    
    const title = document.createElement('h3');
    title.textContent = list.name || 'Untitled List';
    
    const itemCount = document.createElement('p');
    const totalItems = list.items?.length || 0;
    const rankedItems = list.sortedItems?.length || 0;
    itemCount.textContent = `${totalItems} items (${rankedItems} ranked)`;
    
    const progress = document.createElement('p');
    const percentage = totalItems > 0 ? Math.round((rankedItems / totalItems) * 100) : 0;
    progress.textContent = `Progress: ${percentage}%`;
    
    const lastModified = document.createElement('p');
    if (list.lastModified?.toDate) {
      lastModified.textContent = `Last modified: ${list.lastModified.toDate().toLocaleString()}`;
    }
    
    const actions = document.createElement('div');
    actions.className = 'saved-list-item-actions';
    
    const continueButton = document.createElement('button');
    continueButton.textContent = 'Continue';
    continueButton.className = 'primary';
    continueButton.addEventListener('click', () => {
      loadList(list);
      hideListModal();
    });
    
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.className = 'secondary';
    deleteButton.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm('Are you sure you want to delete this list?')) {
        await deleteList(list.id);
        await loadUserLists();
      }
    });
    
    actions.appendChild(continueButton);
    actions.appendChild(deleteButton);
    
    listItem.appendChild(title);
    listItem.appendChild(itemCount);
    listItem.appendChild(progress);
    listItem.appendChild(lastModified);
    listItem.appendChild(actions);
    
    savedListsContainer.appendChild(listItem);
  });
}

function loadList(list) {
  currentListId = list.id;
  
  // Restore items with IDs
  items = list.items || [];
  sortedItems = list.sortedItems || [];
  currentIndex = list.currentIndex || 0;
  totalSteps = list.totalSteps || 0;
  completedSteps = list.completedSteps || 0;
  
  // Restore mode settings
  rankingMode = list.mode || 'basic';
  dailyEmail = list.dailyEmail || '';
  dailyTime = list.dailyTime || '09:00';
  
  // Update UI
  itemsInput.value = items.join('\n');
  
  if (currentIndex >= items.length) {
    // List is complete
    showResults();
  } else if (sortedItems.length > 0) {
    // In progress - use prepareInsertion to properly initialize low/high
    // for the current item being ranked (saved low/high values are stale
    // from the previous item's completion state)
    inputSection.classList.add('hidden');
    prepareInsertion();
  } else {
    // Just started
    inputSection.classList.remove('hidden');
  }
}

async function saveCurrentList() {
  if (isGuestMode) {
    saveGuestList();
    return;
  }
  
  if (!currentUser || !window.firebaseDb || !window.firebaseDbFunctions) {
    return;
  }
  
  try {
    const { doc, setDoc, serverTimestamp } = window.firebaseDbFunctions;
    
    // Generate list ID if not exists
    if (!currentListId) {
      currentListId = `list_${Date.now()}`;
    }
    
    const listData = {
      name: generateListName(),
      items: items,
      sortedItems: sortedItems,
      currentIndex: currentIndex,
      low: low,
      high: high,
      mid: mid,
      totalSteps: totalSteps,
      completedSteps: completedSteps,
      mode: rankingMode,
      dailyEmail: dailyEmail,
      dailyTime: dailyTime,
      lastModified: serverTimestamp()
    };
    
    const listRef = doc(window.firebaseDb, `users/${currentUser.uid}/lists/${currentListId}`);
    await setDoc(listRef, listData);
  } catch (error) {
    console.error('Error saving list:', error);
  }
}

async function deleteList(listId) {
  if (isGuestMode) {
    localStorage.removeItem(GUEST_STORAGE_KEY);
    return;
  }
  
  if (!currentUser || !window.firebaseDb || !window.firebaseDbFunctions) {
    return;
  }
  
  try {
    const { doc, deleteDoc } = window.firebaseDbFunctions;
    const listRef = doc(window.firebaseDb, `users/${currentUser.uid}/lists/${listId}`);
    await deleteDoc(listRef);
  } catch (error) {
    console.error('Error deleting list:', error);
  }
}

async function checkListLimit() {
  if (isGuestMode) {
    return true;
  }
  
  if (!currentUser || !window.firebaseDb || !window.firebaseDbFunctions) {
    return true;
  }
  
  try {
    const { collection, getDocs } = window.firebaseDbFunctions;
    const listsRef = collection(window.firebaseDb, `users/${currentUser.uid}/lists`);
    const snapshot = await getDocs(listsRef);
    
    return snapshot.size < MAX_LISTS_PER_USER;
  } catch (error) {
    console.error('Error checking list limit:', error);
    return true;
  }
}

function generateListName() {
  if (items.length === 0) {
    return 'Untitled List';
  }
  
  const firstItem = items[0].slice(0, 30);
  if (items.length === 1) {
    return firstItem;
  }
  
  return `${firstItem}... (${items.length} items)`;
}

// Guest mode functions
function saveGuestList() {
  const listData = {
    items: items,
    sortedItems: sortedItems,
    currentIndex: currentIndex,
    low: low,
    high: high,
    mid: mid,
    totalSteps: totalSteps,
    completedSteps: completedSteps,
    mode: rankingMode,
    dailyEmail: dailyEmail,
    dailyTime: dailyTime,
    lastModified: Date.now()
  };
  
  try {
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(listData));
  } catch (error) {
    console.error('Error saving guest list:', error);
  }
}

function loadGuestList() {
  try {
    const stored = localStorage.getItem(GUEST_STORAGE_KEY);
    if (stored) {
      const list = JSON.parse(stored);
      loadList({ ...list, id: 'guest' });
    }
  } catch (error) {
    console.error('Error loading guest list:', error);
  }
}

// Initialize auth state listener
window.initializeAuth = function() {
  if (window.firebaseAuth && window.firebaseAuthFunctions) {
    window.firebaseAuthFunctions.onAuthStateChanged(window.firebaseAuth, async (user) => {
      currentUser = user;
      
      if (user && !isGuestMode) {
        // User is signed in
        updateUserInfo(user);
        showAppUI();
        
        // Check for saved lists
        await loadUserLists();
      } else if (!isGuestMode) {
        // User is signed out
        showAuthUI();
        updateUserInfo(null);
      }
    });
  } else {
    // Firebase failed to load, show auth UI with informative message
    showAuthUI();
    hideAuthError(); // Hide any error messages
    showAuthSuccess('Sign in is currently unavailable. You can continue as a guest to use all ranking features.');
  }
}

// Initialize immediately if Firebase is already loaded, otherwise wait for module
if (window.firebaseReady) {
  window.initializeAuth();
} else {
  // Fallback: if Firebase doesn't load within a reasonable time, show error
  setTimeout(() => {
    if (!window.firebaseReady) {
      window.initializeAuth();
    }
    updateStatsPanel();
  }, 1000);
}

function initializeProgressTracking() {
  completedSteps = 0;

  if (!items.length) {
    totalSteps = 0;
    resetProgressVisual();
    progressText.textContent = '';
    return;
  }

  totalSteps = estimateTotalSteps(items.length);
  updateProgress();
}

function estimateTotalSteps(count) {
  if (count <= 1) {
    return 1;
  }

  let estimate = 0;

  for (let i = 1; i < count; i += 1) {
    estimate += Math.ceil(Math.log2(i + 1));
  }

  // Add an extra step for revealing the final results so we can always
  // smoothly reach 100%.
  return estimate + 1;
}

function markComparisonComplete() {
  if (!totalSteps) {
    return;
  }

  completedSteps = Math.min(completedSteps + 1, totalSteps);
  updateProgress();
}

const lengthDistributionCache = new Map();

function updateStatsPanel() {
  if (!statsPanel) {
    return;
  }

  const count = parseItems(itemsInput.value).length;

  if (count === 0) {
    statsPanel.innerHTML =
      '<p>Enter two or more items to estimate how many comparisons you will make.</p>';
    return;
  }

  const stats = calculateComparisonStats(count);

  if (count === 1) {
    statsPanel.innerHTML =
      '<p>Only one item provided, so no comparisons are needed.</p>';
    return;
  }

  const averageComparisons = formatDecimal(stats.comparisons.average);
  const minComparisons = stats.comparisons.min.toLocaleString();
  const maxComparisons = stats.comparisons.max.toLocaleString();
  const percentile90Comparisons = stats.comparisons.percentile90.toLocaleString();

  statsPanel.innerHTML = `
    <p><strong>${count.toLocaleString()}</strong> items typically require about <strong>${averageComparisons}</strong> pairwise decisions.</p>
    <ul>
      <li>Minimum: ${minComparisons} decisions</li>
      <li>Average: ${averageComparisons} decisions</li>
      <li>90th percentile: ${percentile90Comparisons} decisions</li>
      <li>Maximum: ${maxComparisons} decisions</li>
    </ul>
    <small>Estimates assume each new item is equally likely to end up in any position of the final ranking.</small>
  `;
}

function calculateComparisonStats(count) {
  if (count <= 0) {
    return null;
  }

  const distribution = buildTotalComparisonDistribution(count);
  const summary = summarizeDistribution(distribution);

  return {
    count,
    comparisons: summary,
  };
}

function buildTotalComparisonDistribution(count) {
  let distribution = new Map([[0, 1]]);

  for (let length = 1; length < count; length += 1) {
    const stepDistribution = comparisonsDistributionForLength(length);
    const nextDistribution = new Map();

    distribution.forEach((probability, total) => {
      stepDistribution.forEach((stepProbability, steps) => {
        const combined = total + steps;
        const existing = nextDistribution.get(combined) || 0;
        nextDistribution.set(combined, existing + probability * stepProbability);
      });
    });

    distribution = nextDistribution;
  }

  return distribution;
}

function comparisonsDistributionForLength(length) {
  if (lengthDistributionCache.has(length)) {
    return lengthDistributionCache.get(length);
  }

  const distribution = new Map();

  if (length <= 0) {
    distribution.set(0, 1);
    lengthDistributionCache.set(length, distribution);
    return distribution;
  }

  const denominator = length + 1;

  for (let target = 0; target <= length; target += 1) {
    const steps = comparisonsForInsertion(length, target);
    const current = distribution.get(steps) || 0;
    distribution.set(steps, current + 1 / denominator);
  }

  lengthDistributionCache.set(length, distribution);
  return distribution;
}

function comparisonsForInsertion(length, targetIndex) {
  let low = 0;
  let high = length;
  let steps = 0;

  while (low < high) {
    steps += 1;
    const mid = Math.floor((low + high) / 2);

    if (targetIndex <= mid) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }

  return steps;
}

function summarizeDistribution(distribution) {
  const entries = Array.from(distribution.entries()).sort((a, b) => a[0] - b[0]);

  if (!entries.length) {
    return {
      min: 0,
      max: 0,
      average: 0,
      percentile90: 0,
    };
  }

  let average = 0;
  let percentile90 = entries[entries.length - 1][0];
  let cumulative = 0;

  entries.forEach(([value, probability]) => {
    average += value * probability;
  });

  for (let index = 0; index < entries.length; index += 1) {
    const [value, probability] = entries[index];
    cumulative += probability;

    if (cumulative >= 0.9) {
      percentile90 = value;
      break;
    }
  }

  return {
    min: entries[0][0],
    max: entries[entries.length - 1][0],
    average,
    percentile90,
  };
}

function formatDecimal(value) {
  const options = {
    maximumFractionDigits: 1,
  };

  if (Math.abs(value - Math.round(value)) < 0.05) {
    return Math.round(value).toLocaleString();
  }

  return value.toLocaleString(undefined, options);
}
